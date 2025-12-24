import { Order, OrderStatus } from '../types';

interface Tracking17Result {
  number: string;
  track_info?: {
    latest_status?: {
      status: string; 
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
  // 排除已完成或取消的订单
  const activeOrders = newOrders.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED);

  if (!token) {
    // 基础逻辑：如果提供了单号但状态是等待采购，自动推进到已订购
    activeOrders.forEach(order => {
      let changed = false;
      // 注意：由于用户数据反转，现在采购物流号位于 trackingNumber
      if (order.trackingNumber && order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.PURCHASED;
        order.detailedStatus = '已采购 (本地推断)';
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
      message: updatedCount > 0 ? `已通过本地智能检查更新了 ${updatedCount} 个订单状态` : '没有检测到可更新的状态'
    };
  }

  try {
    // 根据用户导入数据现状，采购原始单号现在位于 trackingNumber 字段
    const payload = activeOrders
      .filter(o => !!o.trackingNumber)
      .map(o => ({ number: o.trackingNumber }));

    if (payload.length === 0) {
      return { updatedOrders: newOrders, count: 0, message: '没有发现带有商家发货单号的活跃订单' };
    }

    const response = await fetch('https://api.17track.net/track/v2.2/gettrackinfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '17token': token
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API Request Failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
        throw new Error(`17TRACK Error: ${data.message}`);
    }

    const trackResults: Tracking17Result[] = data.data.accepted;

    activeOrders.forEach(order => {
      let changed = false;
      // 使用反转后的字段 trackingNumber 进行匹配和状态判定
      if (order.trackingNumber && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.SHIPPED) {
         const info = trackResults.find(r => r.number === order.trackingNumber);
         if (info?.track_info?.latest_status) {
            const statusCode = info.track_info.latest_status.status;
            const newDetail = map17TrackStatus(statusCode);
            
            if (order.detailedStatus !== newDetail) {
                order.detailedStatus = newDetail;
                changed = true;
            }

            // 签收判定
            if (statusCode === '40' && order.status !== OrderStatus.READY_TO_SHIP) {
                order.status = OrderStatus.READY_TO_SHIP;
                order.detailedStatus = '商家已送达仓库';
                changed = true;
            }
            // 运输判定
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
        message: `同步成功！已更新 ${updatedCount} 个订单的商家发货进度` 
    };

  } catch (error) {
    console.error("Logistics Sync Error:", error);
    return syncOrderLogistics(orders, ''); 
  }
};