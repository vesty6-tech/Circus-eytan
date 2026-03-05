export const generateCircusPrompt = (roleDescription: string) => `Create an absolute PHOTOREALISTIC, live-action cinematic photograph of the people in the reference image.
This must look like a real photograph taken with a high-end DSLR camera, NOT a drawing, NOT a painting, and NOT digital concept art.

KEY REQUIREMENT: PRESERVE THE EXACT NUMBER OF PEOPLE.
- If the reference image contains ONE person, the output MUST contain ONLY ONE person. DO NOT ADD ANY OTHER CHARACTERS.
- If the reference image contains MULTIPLE people, transform ALL of them into a cohesive circus troupe.
- The faces of ALL individuals must be clearly recognizable and faithful to the reference.

Facial structures, proportions, bone structures, and key features of ALL subjects must closely match the reference.
The ENTIRE IMAGE must be grounded in strict photographic realism, but the SUBJECT MATTER is highly magical, fairy-like, and enchanting.

SUBTLE REALISTIC ENHANCEMENT
Gentle color correction and soft contrast refinement.
Natural skin texture fully preserved with visible pores and realistic imperfections for all subjects.

APPEARANCE & GROOMING
Minimal, natural makeup. Skin appears clean, glowing, and realistic.
Grooming is elegant, majestic, and ethereal, but strictly realistic in texture.

LIGHTING (PRIORITY)
Breathtaking, magical cinematic studio lighting.
Soft luminous key light slightly above eye level.
Glowing rim light to separate the subjects from the background.
Faces fully visible, evenly illuminated, naturally bright.
Warm, realistic skin tones mixed with vibrant, enchanting ambient light (deep blues, purples, golds, or emeralds) emanating from magical sources.

COMPOSITION & CAMERA
Cinematic group portrait (or solo if only one person).
Shot on 85mm lens, f/1.8 aperture, shallow depth of field.
Faces are the clear focal points in sharp focus.
Majestic, confident, and spellbinding expressions.

MAGICAL CIRCUS ENVIRONMENT
A highly realistic but dreamlike fairy-tale circus tent interior.
Features glowing ethereal fabrics, floating stardust, and spellbinding magical lights.
Color palette: luminous gold, deep midnight blue, rich crimson, and sparkling silver.
The atmosphere is pure high-fantasy magic, but rendered as if it exists in the real physical world.

SUBTLE CINEMATIC EFFECTS
Soft optical bokeh, realistic lens flares, and glowing magical auras.
Floating light particles, fairy dust, and luminous embers rendered with photographic realism.

CIRCUS ROLE, COSTUME & ACTION
The main theme is: ${roleDescription}.
- If multiple people: Adapt this theme to a group performance. For example, if the role is "Aerial Acrobat", they are an aerial duo. If "Ringmaster", one is the Ringmaster and others are magical assistants or performers.
- Costumes: Elegant, magical circus performer outfits tailored to this theme.
- Haute couture fantasy design, real shimmering fabrics (silk, velvet, sequins) mixed with glowing magical elements.
- Movement is graceful and fluid. Hands and body anatomy are 100% correct and realistic.

EXPOSURE & COLOR
Overall image is luminous, vibrant, and clear.
Rich, deep, and magical colors captured on film.
Absolute photographic realism combined with high-end fantasy magic.

STYLE INTENT
Hyper-realistic cinematic photography of a magical fairy-tale circus troupe.
Fairy-like, enchanting, inspiring mood.
Identity clarity and face lighting have absolute priority for ALL subjects.

NEGATIVE PROMPT
NO extra people, NO crowd, NO audience, NO background characters.
NO drawing, NO painting, NO illustration, NO digital art, NO concept art, NO 3D render, NO CGI.
NO cartoon, NO anime, NO sketch, NO watercolor.
NO heavy makeup obscuring the faces.
NO plastic skin, doll faces, or over-smoothing.
NO clown makeup or caricature.
NO dark or low-key lighting that hides the features.
NO anatomical errors.
NO text, watermark, logo, or typography.`;
