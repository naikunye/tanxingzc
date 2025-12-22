import { GoogleGenAI, Type } from "@google/genai";

// 封装 API Key 获取逻辑，处理浏览器环境下的各种边界情况
const getApiKey = () => {
    try {
        // Vercel 部署环境通常通过构建时注入或 process.env 提供
        return (typeof process !== 'undefined' && process.env?.API_KEY) ? process.env.API_KEY : '';
    } catch (e) {
        return '';
    }
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const parseOrderText = async (text: string): Promise<any> => {
  if (!ai) throw new Error("Gemini API Key 未配置，请在环境变量中设置 API_KEY");

  const prompt = `
    你是一个专业的采购助手。请分析以下关于代采订单的文本。
    提取以下信息并以 JSON 格式返回：
    - itemName: 商品名称（简洁，如果是中英混杂请保持原样或转为中文）。
    - quantity: 数量（数字）。
    - priceUSD: 美金单价（数字）。
    - buyerAddress: 完整的收货地址信息，包含姓名和电话（如果提供）。
    - platform: 采购平台（如 Amazon, Taobao, 1688）。
    - platformOrderId: 平台上的采购单号（例如亚马逊的 114-1234567-1234567）。
    - clientOrderId: 客户提供的内部单号。
    
    如果某个字段信息缺失，请根据上下文推断或填 null。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
           { text: prompt },
           { text: `输入文本: "${text}"` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            priceUSD: { type: Type.NUMBER },
            buyerAddress: { type: Type.STRING },
            platform: { type: Type.STRING },
            platformOrderId: { type: Type.STRING },
            clientOrderId: { type: Type.STRING },
          }
        }
      }
    });
    
    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw error;
  }
};

export const parseOrderImage = async (base64Image: string): Promise<any> => {
    if (!ai) throw new Error("Gemini API Key 未配置");

    const base64Data = base64Image.split(',')[1] || base64Image;

    const prompt = `
      请分析这张订单截图、购物车截图或聊天记录截图。
      提取订单细节并返回 JSON：
      - itemName: 商品名称。
      - quantity: 数量。
      - priceUSD: 美金价格。
      - buyerAddress: 地址。
      - platform: 平台。
      - platformOrderId: 采购单号。
      - clientOrderId: 客户单号。
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    { text: prompt },
                    { 
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64Data
                        }
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        itemName: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        priceUSD: { type: Type.NUMBER },
                        buyerAddress: { type: Type.STRING },
                        platform: { type: Type.STRING },
                        platformOrderId: { type: Type.STRING },
                        clientOrderId: { type: Type.STRING },
                    }
                }
            }
        });

        return response.text ? JSON.parse(response.text) : null;
    } catch (error) {
        console.error("Gemini Image Parse Error:", error);
        throw error;
    }
};

export const generateStatusUpdate = async (order: any): Promise<string> => {
    if (!ai) return "API Key 缺失。";
    const prompt = `
      请根据以下信息，生成一条写给客户的中文通知消息。
      商品: ${order.itemName}, 状态: ${order.status}, 客户单号: ${order.clientOrderId || '无'}。
      要求语气专业、礼貌。
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });
        return response.text || "无法生成消息。";
    } catch (e) {
        return "消息生成错误。";
    }
};

export const parseNaturalLanguageSearch = async (query: string): Promise<any> => {
  if (!ai) return null;
  const prompt = `
    将代采订单系统的搜索指令转换为 JSON 过滤条件。
    当前日期: ${new Date().toISOString().split('T')[0]}
    搜索指令: "${query}"
  `;

  try {
     const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
         responseSchema: {
          type: Type.OBJECT,
          properties: {
            startDate: { type: Type.STRING, nullable: true },
            endDate: { type: Type.STRING, nullable: true },
            platform: { type: Type.STRING, nullable: true },
            status: { type: Type.STRING, nullable: true },
            keyword: { type: Type.STRING, nullable: true },
          }
        }
      }
    });

    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
      return null;
  }
};