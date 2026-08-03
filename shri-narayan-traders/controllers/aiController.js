const axios = require('axios');
const db = require('../config/db');

// Helper to generate realistic, high-quality fallback data locally if OpenRouter is unavailable
const generateMockProductDetails = (productName, category, userDescription = '') => {
  const pName = productName || 'Product';
  const cat = category || 'Hardware';
  
  let hsnCode = '8302';
  let gstRate = 18;
  let specifications = 'Material: Premium Steel, Finish: Anti-corrosive, Durability: Heavy duty';
  let description = userDescription 
    ? `This custom-detailed product "${pName}" is built as requested. Description details: ${userDescription}.`
    : `This heavy-duty ${pName} is manufactured from high-quality materials to ensure long-term durability and reliable performance. Designed for easy installation and smooth operation, it represents a professional-grade addition to any project. Perfect for residential or commercial construction projects, it provides excellent structural support.`;
  let suggestedPrice = '450-650';

  // Customize mock values based on category
  switch (cat) {
    case 'Hardware':
      hsnCode = '8302';
      gstRate = 18;
      specifications = 'Material: Stainless Steel, Size: Standard, Finish: Chrome Plated, Rust Resistance: High';
      description = `This premium ${pName} from our hardware collection is engineered for exceptional durability and daily wear resistance. Made from high-grade alloy steel, it provides robust strength and steady structural support. It is the perfect hardware accessory for both home improvement tasks and large-scale industrial designs.`;
      suggestedPrice = '250-450';
      break;
    case 'Furniture':
    case 'Office Furniture':
      hsnCode = '9403';
      gstRate = 18;
      specifications = 'Material: Premium Teak Wood & Plywood, Finish: Veneer Matte Polish, Color: Walnut Brown, Assembly: Pre-assembled';
      description = `Crafted with master craftsmanship, our premium ${pName} combines structural integrity with an elegant aesthetic appeal. Ideal for commercial offices or living rooms, it is built with seasoned wood to resist warping. The fine finish protects the surface while highlighting the natural grain design.`;
      suggestedPrice = '4500-7500';
      break;
    case 'Aluminium Doors':
    case 'Aluminium Windows':
      hsnCode = '7610';
      gstRate = 18;
      specifications = 'Material: Aluminium Alloy (6063-T6), Glass Type: 5mm Toughened Glass, Frame Thickness: 1.5mm, Coating: Powder Coated';
      description = `This custom-fabricated ${pName} is built from high-strength architectural aluminium profiles, ensuring wind-resistance and structural rigidity. Designed to offer top-notch sound insulation and weatherproofing, it enhances modern building designs. Its elegant profile requires zero maintenance and is powder-coated against rust.`;
      suggestedPrice = '8500-12500';
      break;
    case 'Tools':
      hsnCode = '8205';
      gstRate = 18;
      specifications = 'Material: Chrome Vanadium Steel, Grip: Ergonomic Non-slip Rubber, Weight: Lightweight, Grade: Professional';
      description = `The professional-grade ${pName} is designed for precise handling, high torque transmission, and minimal hand fatigue. Drop-forged from vanadium alloy, it is optimized to perform under rigorous workshop conditions. The anti-slip grip provides maximum safety during strenuous operations.`;
      suggestedPrice = '350-750';
      break;
    case 'Electrical':
      hsnCode = '8536';
      gstRate = 18;
      specifications = 'Material: Fire-retardant Polycarbonate, Voltage: 240V AC, Contacts: Solid Brass, Compliance: ISI Certified';
      description = `Our heavy-duty electrical ${pName} is designed to meet strict safety and operational standards, offering premium shock protection. Formed from self-extinguishing polymer, it handles standard power configurations safely. A reliable internal contact system prevents overheating.`;
      suggestedPrice = '120-280';
      break;
    case 'Plumbing':
      hsnCode = '8481';
      gstRate = 18;
      specifications = 'Material: Lead-free Solid Brass, Valve Type: Ceramic Disc Cartridge, Thread: 0.5 inch BSP, Finish: Polish Chrome';
      description = `This plumbing-grade ${pName} is forged from high-quality brass alloy to ensure long-term corrosion resistance. Outfitted with high-durability internal sealing, it delivers leak-free performance even under high pressure. The polished outer shell matches standard bathroom fittings.`;
      suggestedPrice = '650-1250';
      break;
  }

  const metaDescription = `Buy high-quality ${pName} online from Shri Narayan Traders, the leading hardware, furniture, and aluminium fabrication provider in Munger, Bihar. Features dynamic construction, ${specifications.split(',')[0]} and competitive retail pricing. Order now for 100% quality guarantee.`;

  return {
    description,
    specifications,
    hsnCode,
    gstRate,
    suggestedPrice,
    metaDescription
  };
};

const generateProductDetails = async (req, res) => {
  try {
    let { productName, category, imageUrl, imageBase64, imageMimeType, userDescription } = req.body;
    
    if (!productName || !category) {
      return res.status(400).json({ error: 'Product name and category are required' });
    }

    // Fetch and convert image URL to base64 if no file upload is present
    if (!imageBase64 && imageUrl && imageUrl.startsWith('http')) {
      try {
        console.log(`[AI Generator] Fetching image from URL: ${imageUrl}`);
        const imgResponse = await fetch(imageUrl);
        if (imgResponse.ok) {
          const arrayBuffer = await imgResponse.arrayBuffer();
          imageBase64 = Buffer.from(arrayBuffer).toString('base64');
          imageMimeType = imgResponse.headers.get('content-type') || 'image/jpeg';
          console.log(`[AI Generator] Successfully fetched and converted image URL to base64 (type: ${imageMimeType})`);
        }
      } catch (err) {
        console.warn('[AI Generator] Failed to fetch image URL for AI processing:', err.message);
      }
    }

    let apiKey = process.env.OPENROUTER_API_KEY;
    let apiModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
    
    // Fallback to database settings key if not present in env
    const config = await db.settings.findOne({ _id: 'global_settings' });
    if (config) {
      if (!apiKey && config.openRouterApiKey) {
        apiKey = config.openRouterApiKey;
      }
      if (config.openRouterModel) {
        apiModel = config.openRouterModel;
      }
    }
    
    // Check if the API key is not set, or is still the default placeholder
    if (!apiKey || apiKey === 'your_openrouter_api_key_here' || apiKey.startsWith('your_')) {
      console.log(`[AI Generator] OpenRouter Key not configured. Using local fallback generator for: "${productName}" (${category})`);
      const fallbackData = generateMockProductDetails(productName, category, userDescription);
      return res.json({ success: true, data: fallbackData, fallback: true, reason: 'Key not configured' });
    }

    try {
      const prompt = `You are a product catalog assistant for Shri Narayan Traders, a hardware, furniture, and aluminium fabrication provider in Munger, Bihar.

We need to generate professional catalog details for:
- Product Name: "${productName}"
- Category: "${category}"
${userDescription ? `- User-provided partial details/description: "${userDescription}"` : ''}

CRITICAL INSTRUCTIONS:
1. STRICT PRODUCT NAME AND INFO FIDELITY: The generated product "description", "specifications", and "metaDescription" MUST be strictly for the product named "${productName}". If the user has provided custom details/description ("${userDescription || ''}"), you MUST incorporate those facts, features, specifications, or details into the generated catalog entry.
2. IMAGE COMPATIBILITY: If a photo/image is uploaded, analyze it carefully to determine the color, design, material, and visual characteristics of the product. If the product name (like a book) doesn't belong to the traditional store categories (like hardware), prioritize the product name "${productName}" and the image contents (like the book cover, pages, color) to generate a beautiful, accurate description.
3. QUALITY AND METADATA: Write a professional 3-4 sentence description mentioning build quality, materials, and usage. Provide the appropriate 4-digit HSN code for "${category}" or the specific item type in India, a valid GST rate (e.g. 5%, 12%, 18%, or 28%), and a realistic price range in INR.
4. OUT-OF-CATEGORY ITEMS: If the product is not something Shri Narayan Traders typically sells (e.g., books, toys, electronics), describe it anyway! Assume the merchant is expanding their catalog or listing a special item. Generate the entry based on the image, name, and user description, with appropriate real-world HSN and GST settings for that item in India.

Return ONLY a valid JSON object with these exact fields:
{
  "description": "3-4 sentence professional product description",
  "specifications": "comma-separated key specs (e.g. Material: Wood, Color: Brown, Size: Standard)",
  "hsnCode": "correct 4-digit HSN code for GST in India",
  "gstRate": number (0, 5, 12, 18, or 28),
  "suggestedPrice": "realistic price range in INR like 150-300",
  "metaDescription": "60-word SEO description including the product name and Shri Narayan Traders"
}

Return only raw JSON. Do not write any markdown code blocks, explanatory text, or carriage returns outside the JSON structure.`;

      let messageContent = [];
      messageContent.push({
        type: "text",
        text: prompt
      });

      if (imageBase64 && imageMimeType) {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: `data:${imageMimeType};base64,${imageBase64}`
          }
        });
      }

      console.log(`[AI Generator] Calling OpenRouter completions via Axios: model=${apiModel}`);
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: apiModel,
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://shri-narayan-traders.vercel.app',
          'X-Title': 'Shri Narayan Traders Portal'
        },
        timeout: 25000
      });

      if (!response.data || !response.data.choices || response.data.choices.length === 0) {
        throw new Error('No completion choices returned from OpenRouter.');
      }

      let text = response.data.choices[0].message.content.trim();

      // Clean up text if any markdown ticks got added
      if (text.startsWith('```json')) {
        text = text.substring(7);
      } else if (text.startsWith('```')) {
        text = text.substring(3);
      }
      if (text.endsWith('```')) {
        text = text.substring(0, text.length - 3);
      }
      text = text.trim();

      const parsedData = JSON.parse(text);
      
      // Basic normalization checks on keys
      const normalizedData = {
        description: parsedData.description || '',
        specifications: parsedData.specifications || '',
        hsnCode: parsedData.hsnCode ? String(parsedData.hsnCode) : '',
        gstRate: parsedData.gstRate !== undefined ? Number(parsedData.gstRate) : 18,
        suggestedPrice: parsedData.suggestedPrice || '',
        metaDescription: parsedData.metaDescription || ''
      };

      console.log(`[AI Generator] Successfully generated details via OpenRouter for: "${productName}"`);
      return res.json({ success: true, data: normalizedData });

    } catch (apiError) {
      console.warn(`[AI Generator] OpenRouter API call failed, reverting to local fallback:`, apiError.message);
      const fallbackData = generateMockProductDetails(productName, category);
      return res.json({ success: true, data: fallbackData, fallback: true, reason: apiError.message });
    }

  } catch (error) {
    console.error('AI generator endpoint failed:', error);
    // Outer catch-all returns a safe payload so form usage never crashes
    try {
      const fallbackData = generateMockProductDetails(req.body.productName, req.body.category);
      return res.json({ success: true, data: fallbackData, fallback: true, reason: error.message });
    } catch (_) {
      return res.status(500).json({ error: 'AI generation error occurred.' });
    }
  }
};

module.exports = {
  generateProductDetails
};
