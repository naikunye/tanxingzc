import { Order, OrderStatus } from '../types';

interface Tracking17Result {
  number: string;
  track_info?: {
    latest_status?: {
      status: string; // "10": InTransit, "20": Expired, "30": InfoReceived, "40": Delivered, "50": Alert
    };
  };
}

const map17TrackStatus = (code: string): string => {
    switch (code) {
        case '10': return '运输中';
        case '20': return '运输过久';
        case '30': return '已揽收';
        case '35': return '投递失败/待取';
        case '40': return '已签收';
        case '50': return '运输异常';
        case '0': return '查询不到';
        default: return '未知状态';
    }
};

export const syncOrderLogistics = async (orders: Order[], token: string): Promise<{ updatedOrders: Order[], count: number, message: string }> => {
  let updatedCount = 0;
  const newOrders = [...orders]; 
  const activeOrders = newOrders.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED && !o.deleted);

  // 本地推断模式 (无 Token)
  if (!token) {
    activeOrders.forEach(order => {
      let changed = false;
      // 如果存在商家单号但状态还是待处理，推断为已采购
      if (order.supplierTrackingNumber && order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.PURCHASED;
        order.detailedStatus = '已采购 (商家已发货)';
        changed = true;
      }
      if (changed) {
        order.lastUpdated = new Date().toISOString();
        updatedCount++;
      }
    });

    return { 
      updatedOrders: newOrders, 
      count: updatedCount, 
      message: updatedCount > 0 ? `本地更新了 ${updatedCount} 条状态` : '没有检测到可更新的状态'
    };
  }

  // API 模式：仅追踪商家发货单号 (TIKTOK 平台单号按要求移除追踪)
  try {
    const payload = activeOrders
      .filter(o => !!o.supplierTrackingNumber)
      .map(o => ({ number: o.supplierTrackingNumber }));

    if (payload.length === 0) {
      return { updatedOrders: newOrders, count: 0, message: '没有发现可追踪的商家发货单号' };
    }

    const response = await fetch('https://api.17track.net/track/v2.2/gettrackinfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '17token': token
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
    const data = await response.json();
    if (data.code !== 0) throw new Error(`17TRACK 错误: ${data.message}`);

    const trackResults: Tracking17Result[] = data.data.accepted;

    activeOrders.forEach(order => {
      let changed = false;
      if (order.supplierTrackingNumber) {
         const info = trackResults.find(r => r.number === order.supplierTrackingNumber);
         if (info?.track_info?.latest_status) {
            const statusCode = info.track_info.latest_status.status;
            const newDetail = map17TrackStatus(statusCode);
            
            if (order.detailedStatus !== newDetail) {
                order.detailedStatus = newDetail;
                changed = true;
            }

            // 商家单号签收 -> 标记为待发货 (已到代理仓库)
            if (statusCode === '40' && order.status !== OrderStatus.READY_TO_SHIP && order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.DELIVERED) {
                order.status = OrderStatus.READY_TO_SHIP;
                order.detailedStatus = '商家已送达仓库';
                changed = true;
            }
            // 商家单号在途 -> 标记为已采购
            else if ((statusCode === '10' || statusCode === '30') && order.status === OrderStatus.PENDING) {
                order.status = OrderStatus.PURCHASED;
                order.detailedStatus = '商家已发货';
                changed = true;
            }
         }
      }
      
      if (changed) {
        order.lastUpdated = new Date().toISOString();
        updatedCount++;
      }
    });

    return { 
        updatedOrders: newOrders, 
        count: updatedCount, 
        message: `同步成功！已更新 ${updatedCount} 条商家入库进度` 
    };

  } catch (error) {
    console.error("物流同步异常:", error);
    return { updatedOrders: newOrders, count: 0, message: '同步过程中发生错误，请检查网络或配置' };
  }
};