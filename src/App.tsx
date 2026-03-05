import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Download, RefreshCw, Image as ImageIcon, AlertCircle, Cloud, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { generateCircusPrompt } from './prompt';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const applyOverlay = async (baseImageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      // Wait for fonts but don't hang forever (max 500ms)
      await Promise.race([
        document.fonts.ready,
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(baseImageUrl);
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Draw a dark gradient at the bottom so the text is always readable
      const gradientHeight = Math.min(400, canvas.height * 0.4);
      const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.5)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

      // Draw decorative emblem (Logo)
      const centerX = canvas.width / 2;
      const emblemY = canvas.height - 180;
      
      ctx.strokeStyle = '#d7a74a'; // Gold 400
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 150, emblemY);
      ctx.lineTo(centerX + 150, emblemY);
      ctx.stroke();

      // Outer diamond
      ctx.fillStyle = '#1c1917'; // Stone 900
      ctx.beginPath();
      ctx.moveTo(centerX, emblemY - 20);
      ctx.lineTo(centerX + 20, emblemY);
      ctx.lineTo(centerX, emblemY + 20);
      ctx.lineTo(centerX - 20, emblemY);
      ctx.fill();
      ctx.stroke();

      // Inner diamond
      ctx.fillStyle = '#d7a74a'; // Gold 400
      ctx.beginPath();
      ctx.moveTo(centerX, emblemY - 12);
      ctx.lineTo(centerX + 12, emblemY);
      ctx.lineTo(centerX, emblemY + 12);
      ctx.lineTo(centerX - 12, emblemY);
      ctx.fill();

      // Draw Main Text
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d7a74a'; // Gold 400
      const titleFontSize = Math.max(50, Math.floor(canvas.width * 0.08));
      ctx.font = `italic 600 ${titleFontSize}px "Playfair Display", Georgia, serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 15;
      ctx.fillText('BM Eytan', centerX, canvas.height - 85);

      // Draw Date
      const dateFontSize = Math.max(20, Math.floor(canvas.width * 0.03));
      ctx.fillStyle = '#fbf8f1'; // Gold 50
      ctx.font = `500 ${dateFontSize}px "Lato", Arial, sans-serif`;
      (ctx as any).letterSpacing = '8px';
      ctx.shadowBlur = 8;
      ctx.fillText('17 / 05 / 2026', centerX, canvas.height - 40);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(baseImageUrl);
    img.src = baseImageUrl;
  });
};

const CIRCUS_ROLES = [
  { fr: 'Acrobate Aérien', en: 'Aerial Acrobat, suspended gracefully on glowing ethereal silks' },
  { fr: 'Cracheur de Feu Magique', en: 'Magical Fire Breather, exhaling a cloud of sparkling, colorful fairy-fire' },
  { fr: 'Maître des Illusions', en: 'Master Illusionist, surrounded by floating, glowing tarot cards and mystical smoke' },
  { fr: 'Dompteur d\'Étoiles', en: 'Star Tamer, gently holding a glowing, living constellation of stars in their hands' },
  { fr: 'Funambule Céleste', en: 'Celestial Tightrope Walker, balancing on a glowing thread of light above a starry abyss' },
  { fr: 'Jongleur de Lumière', en: 'Light Juggler, juggling brilliant, floating orbs of pure luminescent energy' },
  { fr: 'Trapéziste de Cristal', en: 'Crystal Trapeze Artist, swinging on a trapeze made of glowing enchanted crystal' },
  { fr: 'Magicien des Rêves', en: 'Dream Magician, conjuring floating, glowing butterflies made of pure light' },
  { fr: 'Maître de Piste Enchanté', en: 'Enchanted Ringmaster, wearing a majestic glowing top hat and holding a sparkling wand of light' },
  { fr: 'Charmeur de Créatures Féériques', en: 'Fairy Creature Charmer, accompanied by tiny, glowing, photorealistic magical sprites' },
  { fr: 'Danseur de Poussière d\'Étoiles', en: 'Stardust Dancer, twirling as trails of glowing stardust follow their elegant movements' },
  { fr: 'Musicien Céleste', en: 'Celestial Musician, playing a glowing, magical instrument made of pure light and crystal' },
  { fr: 'Contortionniste Élastique', en: 'Contortionist, bending body in graceful, impossible shapes surrounded by floating geometric lights' },
  { fr: 'Lanceur de Lames d\'Argent', en: 'Knife Thrower, holding glowing magical daggers with a spinning target of light in the background' },
  { fr: 'Échassier Géant', en: 'Stilt Walker, wearing a majestic, elongated costume that reaches towards the stars' },
  { fr: 'Maître de la Roue Cyr', en: 'Cyr Wheel Artist, spinning inside a giant glowing ring of pure energy' },
  { fr: 'Titan du Cirque', en: 'Strongman, lifting massive glowing orbs of heavy light with ease and elegance' },
  { fr: 'Équilibriste sur Cannes', en: 'Hand Balancer, performing a one-arm handstand on a high pillar of crystal' }
];

export default function App() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceMimeType, setSourceMimeType] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [rawResultImage, setRawResultImage] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<{fr: string, en: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
      setIsCheckingKey(false);
    };
    checkKey();
  }, []);

  // Auto-generate when source image is set
  React.useEffect(() => {
    if (sourceImage && sourceMimeType && !resultImage && !isGenerating && !error) {
      generatePortrait();
    }
  }, [sourceImage, sourceMimeType]);

  const uploadToCloudinary = async (dataUrl: string) => {
    // Use environment variables or fallback to user-provided credentials
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dix7vebte";
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "circus_upload";

    if (!cloudName || !uploadPreset) {
      console.log("Cloudinary non configuré. L'image ne sera pas sauvegardée dans le cloud.");
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);
    try {
      const formData = new FormData();
      formData.append('file', dataUrl);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde sur Cloudinary');
      }

      const data = await response.json();
      console.log("Image sauvegardée sur Cloudinary :", data.secure_url);
      setUploadSuccess(true);
    } catch (err) {
      console.error("Cloudinary upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadVideoToCloudinary = async (videoBlob: Blob) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dix7vebte";
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "circus_upload";

    if (!cloudName || !uploadPreset) {
      console.log("Cloudinary non configuré.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', videoBlob, 'video.mp4');
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde vidéo sur Cloudinary');
      }

      const data = await response.json();
      console.log("Vidéo sauvegardée sur Cloudinary :", data.secure_url);
    } catch (err) {
      console.error("Cloudinary video upload error:", err);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Veuillez uploader un fichier image.');
      return;
    }

    try {
      const resized = await new Promise<{ dataUrl: string, mimeType: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1024; // Resize to max 1024px to speed up API
            
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error("Failed to get canvas context"));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const mimeType = 'image/jpeg';
            const dataUrl = canvas.toDataURL(mimeType, 0.8);
            resolve({ dataUrl, mimeType });
          };
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      setSourceImage(resized.dataUrl);
      setSourceMimeType(resized.mimeType);
      setResultImage(null);
      setError(null);
    } catch (err) {
      console.error("Error processing image:", err);
      setError("Erreur lors du traitement de l'image.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const generatePortrait = async () => {
    if (!sourceImage || !sourceMimeType) return;

    let randomRole;
    do {
      randomRole = CIRCUS_ROLES[Math.floor(Math.random() * CIRCUS_ROLES.length)];
    } while (currentRole && randomRole.fr === currentRole.fr);

    setCurrentRole(randomRole);
    setResultImage(null); // Clear previous image to avoid mismatch with new role title
    setRawResultImage(null);
    setResultVideo(null);
    setIsGenerating(true);
    setError(null);

    try {
      // @ts-ignore
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      // Extract base64 data without the data:image/jpeg;base64, prefix
      const base64Data = sourceImage.split(',')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: sourceMimeType,
              },
            },
            {
              text: generateCircusPrompt(randomRole.en),
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4",
            imageSize: "1K"
          }
        }
      });

      let foundImage = false;
      if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
            setRawResultImage(imageUrl);
            const finalImage = await applyOverlay(imageUrl);
            setResultImage(finalImage);
            foundImage = true;
            
            // Upload to Cloudinary in the background
            uploadToCloudinary(finalImage);
            break;
          }
        }
      }

      if (!foundImage) {
        // Check if there's text explaining why it failed (e.g. safety)
        const textPart = response.candidates[0].content.parts.find(p => p.text);
        if (textPart && textPart.text) {
          throw new Error(`Le modèle a répondu : ${textPart.text}`);
        }
        throw new Error("Aucune image n'a été renvoyée par le modèle. L'image a peut-être été bloquée par les filtres de sécurité.");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      const errorMessage = err.message || "";
      if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        setError("Quota dépassé. Veuillez vérifier la facturation de votre projet Google Cloud ou réessayer plus tard.");
      } else if (errorMessage.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("Clé API invalide ou introuvable. Veuillez la sélectionner à nouveau.");
      } else {
        setError(errorMessage || "Échec de la génération de l'image. Veuillez réessayer.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setSourceImage(null);
    setSourceMimeType(null);
    setResultImage(null);
    setRawResultImage(null);
    setResultVideo(null);
    setCurrentRole(null);
    setError(null);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateVideo = async () => {
    if (!rawResultImage || !currentRole) return;
    setIsVideoGenerating(true);
    setError(null);

    try {
      // @ts-ignore
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      const base64Data = rawResultImage.split(',')[1];
      const mimeType = rawResultImage.split(';')[0].split(':')[1];

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic slow motion video of ${currentRole.en}. The character comes to life with subtle breathing and elegant movements. Magical atmosphere, sparkling lights. High quality, photorealistic.`,
        image: {
          imageBytes: base64Data,
          mimeType: mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '9:16'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        const videoUri = operation.response.generatedVideos[0].video.uri;
        const response = await fetch(videoUri, {
          headers: { 'x-goog-api-key': apiKey }
        });
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        setResultVideo(videoUrl);
        
        // Upload to Cloudinary
        uploadVideoToCloudinary(blob);
      } else {
        throw new Error("La génération de vidéo a échoué.");
      }
    } catch (err: any) {
      console.error("Video generation error:", err);
      let errorMessage = err.message || "Erreur lors de la génération de la vidéo.";
      
      // Check for safety related errors or generic failures that might be safety blocks
      if (errorMessage.includes("safety") || errorMessage.includes("blocked") || errorMessage.includes("échoué")) {
        errorMessage = "La génération de vidéo a échoué. Les filtres de sécurité peuvent bloquer la création de vidéos impliquant des enfants ou des personnes réelles.";
      }
      
      setError(errorMessage);
    } finally {
      setIsVideoGenerating(false);
    }
  };

  const downloadMedia = () => {
    if (resultVideo) {
      const a = document.createElement('a');
      a.href = resultVideo;
      a.download = 'portrait-cirque-anime.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (resultImage) {
      const a = document.createElement('a');
      a.href = resultImage;
      a.download = 'portrait-cirque.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (isCheckingKey) {
    return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><Sparkles className="animate-spin text-gold-500" size={32} /></div>;
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 font-sans">
        <div className="max-w-md w-full bg-stone-900 rounded-2xl shadow-2xl p-8 text-center border border-gold-500/30">
          <div className="w-16 h-16 bg-velvet-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-velvet-700/30">
            <Sparkles className="text-velvet-500" size={32} />
          </div>
          <h2 className="font-serif text-3xl text-gold-200 mb-4">Clé API Requise</h2>
          <p className="text-stone-400 mb-6 leading-relaxed">
            Pour utiliser le modèle d'image de la plus haute qualité (Gemini 3.1 Flash Image) et éviter les limites de quota, vous devez connecter votre propre projet Google Cloud facturé.
          </p>
          <p className="text-sm text-stone-500 mb-8">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-gold-400 hover:text-gold-300 underline transition-colors">
              En savoir plus sur la facturation
            </a>
          </p>
          <button
            onClick={async () => {
              if (window.aistudio) {
                await window.aistudio.openSelectKey();
                setHasKey(true);
              }
            }}
            className="w-full bg-gradient-to-r from-gold-600 to-gold-400 text-stone-950 rounded-xl py-4 px-6 font-bold hover:from-gold-500 hover:to-gold-300 transition-all shadow-lg hover:shadow-gold-500/20"
          >
            Sélectionner une Clé API
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-velvet-900 selection:text-gold-200 pb-20 bg-stone-950 text-stone-200">
      {/* Header */}
      <header className="pt-12 pb-8 px-6 text-center max-w-3xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <img 
            src="https://res.cloudinary.com/dix7vebte/image/upload/v1769636370/ChatGPT_Image_28_janv._2026_22_37_53_m90jbc.png" 
            alt="Logo Eytan" 
            className="w-48 md:w-64 mb-6 drop-shadow-2xl"
          />
          <p className="text-stone-300 max-w-lg mx-auto leading-relaxed font-light">
            Uploadez votre photo et entrez dans la lumière. Notre IA vous transformera en une troupe d'artistes de cirque époustouflante.
          </p>
        </motion.div>
      </header>

      <main className="max-w-md mx-auto px-6 relative z-10 pb-12">
        <AnimatePresence mode="wait">
          {!sourceImage ? (
            /* Upload State */
            <motion.div 
              key="upload"
              className="flex flex-col gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-between border-b border-stone-700 pb-4">
                <h3 className="font-serif text-2xl text-gold-200">Votre Photo</h3>
              </div>

              <div 
                className="border-2 border-dashed border-stone-700 rounded-sm bg-stone-900/50 aspect-[3/4] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-gold-500/50 hover:bg-stone-900 transition-all group relative overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gold-900/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-20 h-20 rounded-full bg-stone-950 border border-stone-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-gold-500/50 transition-all shadow-xl">
                  <Upload className="text-stone-400 group-hover:text-gold-400 transition-colors" size={32} />
                </div>
                <h4 className="font-serif text-2xl mb-3 text-stone-200 group-hover:text-gold-200 transition-colors">Uploadez une photo</h4>
                <p className="text-sm text-stone-400 max-w-[240px] leading-relaxed">
                  Glissez-déposez ou cliquez pour parcourir. <br/>Idéal pour les portraits solo ou les groupes.
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {error && (
                <div className="bg-velvet-900/20 border border-velvet-900/50 text-velvet-300 p-4 rounded-sm flex items-start gap-3 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </motion.div>
          ) : (
            /* Result State */
            <motion.div 
              key="result"
              className="flex flex-col gap-6 w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center justify-end border-b border-stone-700 pb-4 min-h-[3rem]">
                <div className="flex items-center gap-3 shrink-0">
                  {(resultImage || resultVideo) && (
                    <button 
                      onClick={downloadMedia}
                      className="text-xs uppercase tracking-widest text-gold-500 font-bold hover:text-gold-300 transition-colors flex items-center gap-2"
                    >
                      <Download size={14} /> {resultVideo ? 'Télécharger ma vidéo' : 'Télécharger ma photo'}
                    </button>
                  )}
                </div>
              </div>

              <h3 className="font-serif text-2xl text-gold-200 text-center my-2 px-4">
                {resultImage && currentRole ? currentRole.fr : (isGenerating ? 'La Transformation...' : 'La Transformation')}
              </h3>

              <div className="relative rounded-sm overflow-hidden aspect-[3/4] bg-stone-900 shadow-2xl border border-stone-700 flex items-center justify-center group">
                {/* Decorative corner borders */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-gold-500/30 z-20 pointer-events-none" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-gold-500/30 z-20 pointer-events-none" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-gold-500/30 z-20 pointer-events-none" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-gold-500/30 z-20 pointer-events-none" />

                <AnimatePresence mode="wait">
                  {isGenerating && (
                    <motion.div 
                      key="generating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-stone-950 flex flex-col items-center justify-center text-white z-10"
                    >
                      <div className="relative w-32 h-32 mb-8">
                        <motion.div 
                          className="absolute inset-0 border-2 border-gold-500/20 rounded-full"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        />
                        <motion.div 
                          className="absolute inset-4 border-2 border-gold-500/40 rounded-full"
                          animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0.8] }}
                          transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeInOut" }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="text-gold-500" size={40} />
                        </div>
                      </div>
                      <p className="font-serif text-2xl italic text-gold-100 mb-3 text-center px-4">
                        {currentRole ? `Transformation en ${currentRole.fr}...` : 'Création de la magie...'}
                      </p>
                      <p className="text-[10px] text-stone-500 tracking-[0.3em] uppercase">Cela peut prendre un instant</p>
                    </motion.div>
                  )}

                  {resultImage && (
                    <motion.img 
                      key="result"
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      src={resultImage} 
                      alt="Transformed Portrait" 
                      className={`w-full h-full object-cover ${resultVideo ? 'hidden' : ''}`}
                    />
                  )}

                  {isVideoGenerating && (
                    <motion.div 
                      key="video-generating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20"
                    >
                      <div className="relative w-24 h-24 mb-6">
                        <motion.div 
                          className="absolute inset-0 border-2 border-gold-500/20 rounded-full"
                          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video className="text-gold-500" size={32} />
                        </div>
                      </div>
                      <p className="font-serif text-xl italic text-gold-100 mb-2">Animation en cours...</p>
                      <p className="text-[10px] text-stone-400 tracking-[0.2em] uppercase">Veuillez patienter</p>
                    </motion.div>
                  )}

                  {resultVideo && (
                    <motion.video
                      key="video-result"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      src={resultVideo}
                      controls
                      autoPlay
                      loop
                      className="w-full h-full object-cover z-10"
                    />
                  )}
                </AnimatePresence>
              </div>

              {sourceImage && resultImage && (
                <div className="flex flex-col gap-3">
                  {!resultVideo && !isVideoGenerating && (
                    <button
                      onClick={generateVideo}
                      className="w-full bg-stone-900 border border-velvet-900/50 text-velvet-500 rounded-sm py-4 px-6 font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-stone-800 hover:text-velvet-400 hover:border-velvet-700 transition-all shadow-[0_0_15px_rgba(131,22,22,0.1)] hover:shadow-[0_0_20px_rgba(131,22,22,0.2)]"
                    >
                      <Video size={18} className="text-velvet-600" />
                      Transformer en vidéo
                    </button>
                  )}

                  <button
                    onClick={generatePortrait}
                    disabled={isGenerating || isVideoGenerating}
                    className="w-full bg-stone-900 border border-gold-500 text-gold-400 rounded-sm py-5 px-6 font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-stone-800 hover:text-gold-300 hover:border-gold-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(204,142,46,0.1)] hover:shadow-[0_0_30px_rgba(204,142,46,0.3)]"
                  >
                    <Sparkles size={20} className="text-gold-500" />
                    Générer une autre photo
                  </button>
                  
                  <button
                    onClick={reset}
                    disabled={isGenerating}
                    className="w-full text-stone-500 text-xs uppercase tracking-widest py-3 hover:text-gold-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={12} />
                    Changer de photo
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>


    </div>
  );
}
