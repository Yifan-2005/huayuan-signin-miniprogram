Page({
  data: {
    signRecords: [],
  },

  onLoad: function () {
    this.loadSignRecords();
  },

  loadSignRecords: function () {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.class) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
      return;
    }

    const db = wx.cloud.database();
    
    // 直接获取所有记录，使用时间戳排序（如果有）
    db.collection('sign_records')
      .where({
        _openid: userInfo._openid
      })
      .orderBy('signTimeStamp', 'desc') // 使用时间戳排序，如果没有则会自动忽略
      .get()
      .then((res) => {
        if (res.data.length > 0) {
          console.log('原始记录数据:', res.data);
          
          // 直接使用记录中的数据，不再进行复杂的时间格式化
          const processedRecords = res.data.map(record => {
            return {
              ...record,
              // 如果已经是格式化的字符串，直接使用，否则显示原始值
              formattedTime: typeof record.signTime === 'string' ? record.signTime : record.signTime,
              // 确保类型字段存在
              type: record.type || '未知签到类型',
              // 确保课程名称存在
              courseName: record.courseName || '未知课程'
            }
          });

          this.setData({
            signRecords: processedRecords,
          });

          console.log('处理后的记录:', processedRecords);
        } else {
          wx.showToast({
            title: '没有找到签到记录',
            icon: 'none',
          });
          
          this.setData({
            signRecords: [],
          });
        }
      })
      .catch((err) => {
        console.error('加载签到记录失败', err);
        wx.showToast({
          title: '加载失败，请稍后再试',
          icon: 'none',
        });
      });
  },

  formatTime: function (timestamp) {
    // 检查 timestamp 是否为字符串
    if (typeof timestamp === 'string') {
      // 尝试提取时间信息
      const timeMatch = timestamp.match(/(\d{2}):(\d{2}):(\d{2})/);
      const dateMatch = timestamp.match(/([A-Za-z]+)\s*([A-Za-z]+)(\d{1,2})(\d{4})/);
      
      if (timeMatch && dateMatch) {
        const hour = timeMatch[1];
        const minute = timeMatch[2];
        const second = timeMatch[3];
        const month = this.getMonthNumber(dateMatch[2]);
        const day = dateMatch[3];
        const year = dateMatch[4];
        
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour}:${minute}:${second}`;
      }
      
      // 如果无法解析，直接返回原始字符串
      return timestamp;
    }
    
    // 处理 Date 对象
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '无效时间';

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },
  
  // 辅助函数：将月份名称转换为数字
  getMonthNumber: function(monthName) {
    const months = {
      'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
      'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    };
    return months[monthName] || 1;
  },

  onShareTimeline() {
    return {
      title: "华园签上线啦~",
      imageUrl: '/images/分享.png'
    };
  },

  onShareAppMessage() {
    return {
      title: "华园签上线啦~",
      path: "/pages/index/index"
    };
  }
});