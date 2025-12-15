import Listing from '../models/Listing.js';

/**
 * Chat với AI - Trả lời câu hỏi về phòng trọ
 */
export const chatWithAI = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Parse câu hỏi để tìm tiêu chí
    let searchCriteria = {};
    try {
      searchCriteria = parseUserQuery(message);
    } catch (error) {
      console.error('Error parsing user query:', error);
      // Tiếp tục với searchCriteria rỗng
    }
    
    // Tìm listings phù hợp
    let matchedListings = [];
    try {
      matchedListings = await findMatchingListings(searchCriteria);
    } catch (error) {
      console.error('Error finding matching listings:', error);
      // Tiếp tục với matchedListings rỗng
    }
    
    // Lấy thêm listings mới nhất để có context
    let recentListings = [];
    try {
      recentListings = await Listing.find({ status: 'published' })
        .select('title address city district ward price area type amenities description')
        .limit(15)
        .sort('-createdAt');
    } catch (error) {
      console.error('Error fetching recent listings:', error);
      // Tiếp tục với recentListings rỗng
    }

    // Kết hợp và loại bỏ trùng lặp
    const allListings = [...matchedListings, ...recentListings];
    const uniqueListings = Array.from(
      new Map(allListings.map(item => [item._id.toString(), item])).values()
    ).slice(0, 20);

    // Tạo context cho AI
    const listingsContext = uniqueListings.map(listing => ({
      id: listing._id.toString(),
      title: listing.title || 'Không có tiêu đề',
      address: listing.address || '',
      city: listing.city || '',
      district: listing.district || '',
      ward: listing.ward || '',
      price: listing.price || 0,
      area: listing.area || 0,
      type: listing.type || 'room',
      typeLabel: getTypeLabel(listing.type || 'room'),
      amenities: listing.amenities || [],
      amenitiesLabels: (listing.amenities || []).map(a => getAmenityLabel(a)),
      description: (listing.description || '').substring(0, 150)
    }));

    // Tạo system prompt chi tiết
    let systemPrompt = '';
    try {
      systemPrompt = createSystemPrompt(listingsContext, searchCriteria);
    } catch (error) {
      console.error('Error creating system prompt:', error);
      systemPrompt = 'Bạn là trợ lý AI của NhaTro247. Trả lời các câu hỏi về phòng trọ.';
    }

    // Gọi AI service
    let aiResponse;
    try {
      aiResponse = await getAIResponse(
        systemPrompt, 
        message, 
        conversationHistory, 
        listingsContext, 
        searchCriteria
      );
      
      // Đảm bảo có response
      if (!aiResponse || aiResponse.trim() === '') {
        console.log('AI response is empty, using fallback');
        aiResponse = getRuleBasedResponse(message, listingsContext, searchCriteria);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      console.error('Error stack:', error.stack);
      // Fallback về rule-based
      try {
        aiResponse = getRuleBasedResponse(message, listingsContext, searchCriteria);
      } catch (fallbackError) {
        console.error('Error in fallback response:', fallbackError);
        aiResponse = 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi. Vui lòng thử lại sau hoặc liên hệ với chúng tôi.';
      }
    }

    res.json({
      response: aiResponse,
      timestamp: new Date(),
      suggestedListings: matchedListings.slice(0, 3).map(l => ({
        id: l._id.toString(),
        title: l.title || 'Phòng trọ',
        address: l.address || '',
        district: l.district || '',
        price: l.price || 0,
        area: l.area || 0,
        type: l.type || 'room'
      }))
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Xin lỗi, tôi gặp sự cố. Vui lòng thử lại sau.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Parse câu hỏi của người dùng để tìm tiêu chí
 */
function parseUserQuery(message) {
  const lowerMessage = message.toLowerCase();
  const criteria = {
    district: null,
    city: null,
    minPrice: null,
    maxPrice: null,
    amenities: [],
    type: null,
    minArea: null,
    maxArea: null
  };

  // Tìm quận/phường
  const districts = [
    'quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8',
    'quận 9', 'quận 10', 'quận 11', 'quận 12', 'bình thạnh', 'tân bình', 'tân phú',
    'phú nhuận', 'gò vấp', 'bình tân', 'thủ đức', 'hóc môn', 'củ chi', 'nhà bè', 'cần giờ'
  ];

  for (const district of districts) {
    if (lowerMessage.includes(district)) {
      criteria.district = district.replace('quận ', 'Quận ').replace(/\b\w/g, l => l.toUpperCase());
      break;
    }
  }

  // Tìm giá cả
  const pricePatterns = [
    { pattern: /từ\s*(\d+)\s*đến\s*(\d+)\s*(?:triệu|tr)/gi, multiplier: 1000000 },
    { pattern: /(\d+)\s*đến\s*(\d+)\s*(?:triệu|tr)/gi, multiplier: 1000000 },
    { pattern: /dưới\s*(\d+)\s*(?:triệu|tr)/gi, multiplier: 1000000 },
    { pattern: /trên\s*(\d+)\s*(?:triệu|tr)/gi, multiplier: 1000000 },
    { pattern: /khoảng\s*(\d+)\s*(?:triệu|tr)/gi, multiplier: 1000000 },
    { pattern: /(\d+)\s*(?:triệu|tr)/gi, multiplier: 1000000 },
    { pattern: /(\d+)\s*(?:nghìn|k)/gi, multiplier: 1000 }
  ];

  for (const { pattern, multiplier } of pricePatterns) {
    const matches = [...message.matchAll(pattern)];
    if (matches.length > 0) {
      const match = matches[0];
      if (match[2]) {
        criteria.minPrice = parseInt(match[1]) * multiplier;
        criteria.maxPrice = parseInt(match[2]) * multiplier;
      } else if (lowerMessage.includes('dưới')) {
        criteria.maxPrice = parseInt(match[1]) * multiplier;
      } else if (lowerMessage.includes('trên') || lowerMessage.includes('từ')) {
        criteria.minPrice = parseInt(match[1]) * multiplier;
      } else {
        const price = parseInt(match[1]) * multiplier;
        criteria.minPrice = price * 0.8;
        criteria.maxPrice = price * 1.2;
      }
      break;
    }
  }

  // Tìm diện tích
  const areaPatterns = [
    { pattern: /(\d+)\s*đến\s*(\d+)\s*m[²2]/, minIdx: 1, maxIdx: 2 },
    { pattern: /từ\s*(\d+)\s*đến\s*(\d+)\s*m[²2]/, minIdx: 1, maxIdx: 2 },
    { pattern: /dưới\s*(\d+)\s*m[²2]/, maxOnly: true },
    { pattern: /trên\s*(\d+)\s*m[²2]/, minOnly: true },
    { pattern: /(\d+)\s*m[²2]/, single: true }
  ];

  for (const { pattern, minIdx, maxIdx, maxOnly, minOnly, single } of areaPatterns) {
    const matches = [...message.matchAll(pattern)];
    if (matches.length > 0) {
      const match = matches[0];
      if (single) {
        const area = parseInt(match[1]);
        criteria.minArea = area * 0.9;
        criteria.maxArea = area * 1.1;
      } else if (maxOnly) {
        criteria.maxArea = parseInt(match[1]);
      } else if (minOnly) {
        criteria.minArea = parseInt(match[1]);
      } else {
        criteria.minArea = parseInt(match[minIdx]);
        criteria.maxArea = parseInt(match[maxIdx]);
      }
      break;
    }
  }

  // Tìm tiện ích
  const amenityMap = {
    'wifi': ['wifi', 'internet', 'mạng'],
    'ac': ['máy lạnh', 'điều hòa', 'ac', 'lạnh'],
    'private_bathroom': ['wc riêng', 'toilet riêng', 'nhà vệ sinh riêng', 'vệ sinh riêng'],
    'parking': ['chỗ để xe', 'để xe', 'parking', 'bãi đỗ', 'gửi xe'],
    'kitchen': ['bếp', 'nấu ăn', 'bếp riêng'],
    'washing_machine': ['máy giặt', 'giặt'],
    'elevator': ['thang máy', 'elevator'],
    'security': ['bảo vệ', 'an ninh', 'security']
  };

  for (const [amenity, keywords] of Object.entries(amenityMap)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      criteria.amenities.push(amenity);
    }
  }

  // Tìm loại hình
  if (lowerMessage.includes('phòng trọ') || lowerMessage.includes('trọ')) {
    criteria.type = 'room';
  } else if (lowerMessage.includes('nhà nguyên căn') || lowerMessage.includes('nhà riêng')) {
    criteria.type = 'house';
  } else if (lowerMessage.includes('chung cư') || lowerMessage.includes('căn hộ')) {
    criteria.type = 'apartment';
  } else if (lowerMessage.includes('chung') || lowerMessage.includes('share')) {
    criteria.type = 'shared';
  }

  return criteria;
}

/**
 * Tìm listings phù hợp với tiêu chí
 */
async function findMatchingListings(criteria) {
  const query = { status: 'published' };

  if (criteria.district) {
    query.district = new RegExp(criteria.district, 'i');
  }

  if (criteria.type) {
    query.type = criteria.type;
  }

  if (criteria.minPrice || criteria.maxPrice) {
    query.price = {};
    if (criteria.minPrice) query.price.$gte = criteria.minPrice;
    if (criteria.maxPrice) query.price.$lte = criteria.maxPrice;
  }

  if (criteria.minArea || criteria.maxArea) {
    query.area = {};
    if (criteria.minArea) query.area.$gte = criteria.minArea;
    if (criteria.maxArea) query.area.$lte = criteria.maxArea;
  }

  if (criteria.amenities.length > 0) {
    query.amenities = { $in: criteria.amenities };
  }

  const listings = await Listing.find(query)
    .select('title address city district ward price area type amenities description')
    .limit(10)
    .sort('-createdAt');

  return listings;
}

/**
 * Tạo system prompt chi tiết
 */
function createSystemPrompt(listingsContext, searchCriteria) {
  const hasCriteria = Object.values(searchCriteria).some(v => 
    v !== null && (Array.isArray(v) ? v.length > 0 : true)
  );

  let prompt = `Bạn là trợ lý AI chuyên nghiệp của hệ thống tìm phòng trọ NhaTro247. 
Nhiệm vụ của bạn là trả lời CHÍNH XÁC và CHI TIẾT các câu hỏi về phòng trọ.

THÔNG TIN CÁC PHÒNG TRỌ HIỆN CÓ (${listingsContext.length} phòng):
${JSON.stringify(listingsContext, null, 2)}

QUY TẮC TRẢ LỜI CHẶT CHẼ:
1. Trả lời bằng tiếng Việt, thân thiện nhưng CHÍNH XÁC
2. LUÔN trả lời TRỰC TIẾP vào câu hỏi, không lan man
3. Sử dụng THÔNG TIN THỰC TẾ từ danh sách phòng trọ trên, KHÔNG bịa đặt
4. Khi hỏi về LOẠI HÌNH: trả lời cụ thể (phòng trọ, nhà nguyên căn, chung cư, phòng chung)
5. Khi hỏi về GIÁ CẢ: đưa ra mức giá CỤ THỂ từ danh sách (ví dụ: "Từ 3-5 triệu/tháng")
6. Khi hỏi về DIỆN TÍCH: đưa ra diện tích CỤ THỂ (ví dụ: "Từ 20-30m²")
7. Khi hỏi về TIỆN ÍCH: liệt kê CỤ THỂ các tiện ích có sẵn (wifi, máy lạnh, WC riêng...)
8. Khi hỏi về ĐỊA ĐIỂM: liệt kê CỤ THỂ các quận/phường có phòng trọ
9. Nếu có phòng trọ phù hợp, đề xuất 2-3 phòng với thông tin: tên, địa chỉ, giá, diện tích, quận
10. Nếu không có phòng phù hợp, gợi ý tiêu chí tìm kiếm khác

ĐỊNH DẠNG TRẢ LỜI:
- Ngắn gọn, súc tích (150-250 từ)
- Sử dụng emoji phù hợp (📍 vị trí, 💰 giá, 📐 diện tích, ✨ tiện ích, 🏠 loại hình)
- Liệt kê số liệu CỤ THỂ từ danh sách
- Không nói chung chung, luôn có ví dụ cụ thể`;

  if (hasCriteria) {
    prompt += `\n\nNGƯỜI DÙNG ĐANG TÌM KIẾM:
${JSON.stringify(searchCriteria, null, 2)}
Hãy ưu tiên các phòng trọ phù hợp với tiêu chí này và trả lời CHÍNH XÁC.`;
  }

  return prompt;
}

/**
 * Lấy response từ AI
 */
async function getAIResponse(systemPrompt, userMessage, conversationHistory, listingsContext, searchCriteria) {
  // Nếu có OpenAI API key, thử sử dụng OpenAI
  if (process.env.OPENAI_API_KEY) {
    const openAIResponse = await getOpenAIResponse(systemPrompt, userMessage, conversationHistory);
    // Nếu OpenAI thành công, trả về response
    if (openAIResponse) {
      return openAIResponse;
    }
    // Nếu OpenAI fail, fallback về rule-based
  }

  // Fallback: Rule-based responses với thông tin cụ thể
  return getRuleBasedResponse(userMessage, listingsContext, searchCriteria);
}

/**
 * Sử dụng OpenAI API
 */
async function getOpenAIResponse(systemPrompt, userMessage, conversationHistory) {
  try {
    let OpenAI;
    try {
      const openaiModule = await import('openai');
      OpenAI = openaiModule.default || openaiModule.OpenAI;
    } catch (importError) {
      console.log('OpenAI package not installed, using rule-based responses');
      return null; // Sẽ fallback về rule-based
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Error:', error.message);
    return null; // Fallback về rule-based
  }
}

/**
 * Rule-based responses với thông tin cụ thể
 */
function getRuleBasedResponse(message, listings = [], searchCriteria = {}) {
  const lowerMessage = message.toLowerCase();

  // Chào hỏi
  if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || lowerMessage.includes('chào')) {
    return 'Xin chào! 👋 Tôi là trợ lý AI của NhaTro247.\n\n' +
           'Tôi có thể trả lời các câu hỏi về:\n' +
           '🏠 Loại hình phòng trọ\n' +
           '💰 Giá cả\n' +
           '📐 Diện tích\n' +
           '✨ Tiện ích\n' +
           '📍 Địa điểm\n\n' +
           'Bạn muốn hỏi gì về phòng trọ?';
  }

  // Hỏi về LOẠI HÌNH
  if (lowerMessage.includes('loại hình') || lowerMessage.includes('loại') || 
      lowerMessage.includes('kiểu') || lowerMessage.includes('dạng')) {
    if (listings.length > 0) {
      const typeCount = {};
      listings.forEach(l => {
        typeCount[l.type] = (typeCount[l.type] || 0) + 1;
      });

      let response = '🏠 Các loại hình phòng trọ tại NhaTro247:\n\n';
      Object.entries(typeCount).forEach(([type, count]) => {
        response += `${getTypeLabel(type)}: ${count} phòng\n`;
      });

      if (searchCriteria.type) {
        const filtered = listings.filter(l => l.type === searchCriteria.type);
        if (filtered.length > 0) {
          response += `\nCó ${filtered.length} ${getTypeLabel(searchCriteria.type)}:\n`;
          filtered.slice(0, 3).forEach(l => {
            response += `\n🏠 ${l.title}\n`;
            response += `📍 ${l.district}\n`;
            response += `💰 ${formatPrice(l.price)}/tháng | 📐 ${l.area}m²\n`;
          });
        }
      }

      return response;
    }
    return '🏠 Các loại hình phòng trọ:\n\n' +
           '• Phòng trọ: Phòng đơn, có thể có WC riêng/chung\n' +
           '• Nhà nguyên căn: Nhà riêng đầy đủ\n' +
           '• Chung cư: Căn hộ trong tòa nhà\n' +
           '• Phòng chung: Chia sẻ với người khác\n\n' +
           'Bạn muốn tìm loại hình nào?';
  }

  // Hỏi về GIÁ CẢ
  if (lowerMessage.includes('giá') || lowerMessage.includes('tiền') || 
      lowerMessage.includes('phí') || lowerMessage.includes('bao nhiêu tiền')) {
    if (listings.length > 0) {
      const prices = listings.map(l => l.price).filter(p => p > 0);
      if (prices.length === 0) {
        return '💰 Hiện chưa có thông tin giá phòng trọ. Vui lòng xem trên website.';
      }
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

      let priceListings = listings;
      if (searchCriteria.minPrice || searchCriteria.maxPrice) {
        priceListings = listings.filter(l => {
          if (searchCriteria.minPrice && l.price < searchCriteria.minPrice) return false;
          if (searchCriteria.maxPrice && l.price > searchCriteria.maxPrice) return false;
          return true;
        });
      }

      let response = `💰 Giá phòng trọ tại NhaTro247:\n\n`;
      response += `📊 Mức giá: ${formatPrice(minPrice)} - ${formatPrice(maxPrice)}/tháng\n`;
      response += `📈 Giá trung bình: ${formatPrice(avgPrice)}/tháng\n`;

      if (priceListings.length > 0) {
        response += `\nCó ${priceListings.length} phòng trọ phù hợp:\n`;
        priceListings.slice(0, 3).forEach(l => {
          response += `\n🏠 ${l.title}\n`;
          response += `📍 ${l.district} | 📐 ${l.area}m²\n`;
          response += `💰 ${formatPrice(l.price)}/tháng\n`;
        });
      }

      return response;
    }
    return '💰 Giá phòng trọ rất đa dạng:\n\n' +
           '• Phòng trọ: 2-8 triệu/tháng\n' +
           '• Nhà nguyên căn: 8-20 triệu/tháng\n' +
           '• Chung cư: 5-15 triệu/tháng\n\n' +
           'Bạn muốn tìm phòng trọ giá bao nhiêu?';
  }

  // Hỏi về DIỆN TÍCH
  if (lowerMessage.includes('diện tích') || lowerMessage.includes('rộng') || 
      lowerMessage.includes('bao nhiêu m') || lowerMessage.includes('m²') || lowerMessage.includes('m2')) {
    if (listings.length > 0) {
      const areas = listings.map(l => l.area).filter(a => a > 0);
      if (areas.length === 0) {
        return '📐 Hiện chưa có thông tin diện tích phòng trọ. Vui lòng xem trên website.';
      }
      const minArea = Math.min(...areas);
      const maxArea = Math.max(...areas);
      const avgArea = Math.round(areas.reduce((a, b) => a + b, 0) / areas.length);

      let areaListings = listings;
      if (searchCriteria.minArea || searchCriteria.maxArea) {
        areaListings = listings.filter(l => {
          if (searchCriteria.minArea && l.area < searchCriteria.minArea) return false;
          if (searchCriteria.maxArea && l.area > searchCriteria.maxArea) return false;
          return true;
        });
      }

      let response = `📐 Diện tích phòng trọ:\n\n`;
      response += `📊 Mức diện tích: ${minArea} - ${maxArea}m²\n`;
      response += `📈 Diện tích trung bình: ${avgArea}m²\n`;

      if (areaListings.length > 0) {
        response += `\nCó ${areaListings.length} phòng trọ phù hợp:\n`;
        areaListings.slice(0, 3).forEach(l => {
          response += `\n🏠 ${l.title}\n`;
          response += `📍 ${l.district} | 💰 ${formatPrice(l.price)}/tháng\n`;
          response += `📐 ${l.area}m²\n`;
        });
      }

      return response;
    }
    return '📐 Diện tích phòng trọ thường từ:\n\n' +
           '• Phòng trọ: 15-30m²\n' +
           '• Nhà nguyên căn: 40-100m²\n' +
           '• Chung cư: 30-70m²\n\n' +
           'Bạn cần diện tích bao nhiêu?';
  }

  // Hỏi về TIỆN ÍCH
  if (lowerMessage.includes('tiện ích') || lowerMessage.includes('có gì') || 
      lowerMessage.includes('wifi') || lowerMessage.includes('máy lạnh') ||
      lowerMessage.includes('wc') || lowerMessage.includes('bếp') || lowerMessage.includes('xe')) {
    if (listings.length > 0) {
      const amenityCount = {};
      listings.forEach(l => {
        (l.amenities || []).forEach(a => {
          amenityCount[a] = (amenityCount[a] || 0) + 1;
        });
      });

      let response = `✨ Tiện ích có sẵn:\n\n`;
      Object.entries(amenityCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([amenity, count]) => {
          const percentage = Math.round((count / listings.length) * 100);
          response += `${getAmenityLabel(amenity)}: ${count} phòng (${percentage}%)\n`;
        });

      if (searchCriteria.amenities.length > 0) {
        const matching = listings.filter(l => 
          searchCriteria.amenities.every(a => (l.amenities || []).includes(a))
        );
        if (matching.length > 0) {
          response += `\nCó ${matching.length} phòng trọ có các tiện ích bạn cần:\n`;
          matching.slice(0, 3).forEach(l => {
            response += `\n🏠 ${l.title}\n`;
            response += `📍 ${l.district} | 💰 ${formatPrice(l.price)}/tháng\n`;
            response += `✨ ${(l.amenities || []).map(a => getAmenityLabel(a)).join(', ')}\n`;
          });
        }
      }

      return response;
    }
    return '✨ Các tiện ích phổ biến:\n\n' +
           '📶 Wifi\n' +
           '❄️ Máy lạnh\n' +
           '🚿 WC riêng/WC chung\n' +
           '🍳 Bếp\n' +
           '🏍️ Chỗ để xe\n' +
           '🧺 Máy giặt\n' +
           '🏢 Thang máy\n' +
           '🔒 Bảo vệ 24/7\n\n' +
           'Bạn cần tiện ích gì?';
  }

  // Hỏi về ĐỊA ĐIỂM
  if (lowerMessage.includes('địa điểm') || lowerMessage.includes('vị trí') || 
      lowerMessage.includes('địa chỉ') || lowerMessage.includes('ở đâu') || 
      lowerMessage.includes('quận') || lowerMessage.includes('phường') || lowerMessage.includes('khu vực')) {
    if (listings.length > 0) {
      const districts = [...new Set(listings.map(l => l.district))];
      
      let response = `📍 Các khu vực có phòng trọ:\n\n`;
      
      if (searchCriteria.district) {
        const districtListings = listings.filter(l => 
          l.district.toLowerCase().includes(searchCriteria.district.toLowerCase())
        );
        
        if (districtListings.length > 0) {
          response += `Có ${districtListings.length} phòng trọ ở ${searchCriteria.district}:\n\n`;
          districtListings.slice(0, 3).forEach(l => {
            response += `🏠 ${l.title}\n`;
            response += `📍 ${l.address}, ${l.district}\n`;
            response += `💰 ${formatPrice(l.price)}/tháng | 📐 ${l.area}m²\n\n`;
          });
        } else {
          response += `Hiện chưa có phòng trọ ở ${searchCriteria.district}.\n`;
        }
      } else {
        districts.slice(0, 10).forEach(district => {
          const count = listings.filter(l => l.district === district).length;
          response += `📍 ${district}: ${count} phòng trọ\n`;
        });
      }
      
      return response;
    }
    return '📍 Chúng tôi có phòng trọ ở nhiều quận tại TP.HCM:\n\n' +
           'Quận 1, Quận 3, Quận 7, Bình Thạnh, Tân Bình, Tân Phú...\n\n' +
           'Bạn muốn tìm phòng trọ ở quận nào?';
  }

  // Tìm phòng trọ tổng hợp
  if (lowerMessage.includes('tìm') || lowerMessage.includes('phòng') || 
      lowerMessage.includes('trọ') || lowerMessage.includes('cho thuê') || 
      lowerMessage.includes('cần thuê') || lowerMessage.includes('có phòng')) {
    if (listings.length > 0) {
      let filtered = listings;
      
      if (searchCriteria.district) {
        filtered = filtered.filter(l => 
          l.district.toLowerCase().includes(searchCriteria.district.toLowerCase())
        );
      }
      if (searchCriteria.type) {
        filtered = filtered.filter(l => l.type === searchCriteria.type);
      }
      if (searchCriteria.minPrice || searchCriteria.maxPrice) {
        filtered = filtered.filter(l => {
          if (searchCriteria.minPrice && l.price < searchCriteria.minPrice) return false;
          if (searchCriteria.maxPrice && l.price > searchCriteria.maxPrice) return false;
          return true;
        });
      }

      if (filtered.length > 0) {
        let response = `🔍 Tìm thấy ${filtered.length} phòng trọ:\n\n`;
        filtered.slice(0, 5).forEach(l => {
          response += `🏠 ${l.title}\n`;
          response += `📍 ${l.address}, ${l.district}\n`;
          response += `💰 ${formatPrice(l.price)}/tháng | 📐 ${l.area}m²\n`;
          response += `🏠 ${getTypeLabel(l.type)}\n`;
          if (l.amenities && l.amenities.length > 0) {
            response += `✨ ${l.amenities.slice(0, 3).map(a => getAmenityLabel(a)).join(', ')}\n`;
          }
          response += `\n`;
        });
        return response;
      }
    }
    
    return '🔍 Để tìm phòng trọ phù hợp:\n\n' +
           '1. Sử dụng thanh tìm kiếm\n' +
           '2. Sử dụng bộ lọc (giá, vị trí, diện tích, loại hình, tiện ích)\n' +
           '3. Xem bản đồ\n\n' +
           'Bạn muốn tìm phòng trọ như thế nào?';
  }

  // Câu hỏi khác
  if (listings.length > 0) {
    return `Cảm ơn bạn đã liên hệ! Tôi có thể trả lời:\n\n` +
           `🏠 Loại hình phòng trọ\n` +
           `💰 Giá cả (hiện có ${listings.length} phòng trọ)\n` +
           `📐 Diện tích\n` +
           `✨ Tiện ích\n` +
           `📍 Địa điểm\n\n` +
           `Bạn muốn hỏi gì cụ thể?`;
  }
  
  return 'Cảm ơn bạn đã liên hệ! Tôi có thể giúp bạn:\n\n' +
         '✅ Tìm phòng trọ phù hợp\n' +
         '✅ Tư vấn về loại hình, giá cả, diện tích, tiện ích, địa điểm\n' +
         '✅ Hướng dẫn sử dụng website\n\n' +
         'Bạn cần hỗ trợ gì?';
}

/**
 * Helper functions
 */
function getTypeLabel(type) {
  const labels = {
    'room': 'Phòng trọ',
    'house': 'Nhà nguyên căn',
    'apartment': 'Chung cư',
    'shared': 'Phòng chung'
  };
  return labels[type] || type;
}

function getAmenityLabel(amenity) {
  const labels = {
    'wifi': '📶 Wifi',
    'ac': '❄️ Máy lạnh',
    'private_bathroom': '🚿 WC riêng',
    'shared_bathroom': '🚿 WC chung',
    'parking': '🏍️ Chỗ để xe',
    'kitchen': '🍳 Bếp',
    'washing_machine': '🧺 Máy giặt',
    'elevator': '🏢 Thang máy',
    'security': '🔒 Bảo vệ 24/7',
    'loft': '🏠 Gác lửng',
    'pets': '🐾 Cho phép thú cưng'
  };
  return labels[amenity] || amenity;
}

function formatPrice(price) {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)} triệu`;
  } else if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}k`;
  }
  return `${price.toLocaleString('vi-VN')}đ`;
}

