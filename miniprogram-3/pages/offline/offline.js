function getDistance(lat1, lon1, lat2, lon2) {
  const radLat1 = lat1 * Math.PI / 180.0;
  const radLat2 = lat2 * Math.PI / 180.0;
  const a = radLat1 - radLat2;
  const b = (lon1 - lon2) * Math.PI / 180.0;
  const s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
  const earthRadius = 6378137.0;
  return s * earthRadius;
}

Page({
  data: {
    latitude: 23.0491812,
    longitude: 113.3995519,
    markers: [],
    circles: [],
    currentTask: null, // 存储当前任务信息
    hasSigned: false // 是否已签到
  },
  
  onShow() {
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
  
    this.loadSignTask(userInfo.class);
  },
  
  loadSignTask(className) {
    const db = wx.cloud.database();
    const _ = db.command;
    const now = new Date();
    
    // 查询当前用户班级的最新有效任务
    db.collection('sign_tasks')
      .where({
        className: className,
        status: 'active'
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
      .then(res => {
        if (res.data.length === 0) {
          this.setData({ currentTask: null });
          wx.showModal({
            title: '提示',
            content: '当前没有有效的签到任务',
            showCancel: false
          });
          return;
        }
        
        const task = res.data[0];
        this.setData({
          currentTask: task,
          latitude: task.latitude,
          longitude: task.longitude,
          markers: [{
            id: 1,
            latitude: task.latitude,
            longitude: task.longitude,
            name: task.locationText || '签到点',
            iconPath: '/images/坐标.png', 
            width: 30,
            height: 30
          }],
          circles: [{
            latitude: task.latitude,
            longitude: task.longitude,
            radius: task.range,
            color: '#007aff55',
            fillColor: '#7cb5ec33',
            strokeWidth: 1
          }]
        });
        
        this.mapCtx = wx.createMapContext('myMap');
        this.mapCtx.moveToLocation({
          latitude: task.latitude,
          longitude: task.longitude
        });
        
        // 检查是否已经签到过
        this.checkSignStatus(task._id);
      })
      .catch(err => {
        console.error('数据库查询失败', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },
  
  checkSignStatus(taskId) {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) return;
    
    const db = wx.cloud.database();
    const _ = db.command;
    
    db.collection('sign_records')
      .where({
        _openid: userInfo._openid,
        taskId: taskId
      })
      .get()
      .then(res => {
        this.setData({
          hasSigned: res.data.length > 0
        });
      });
  },
  
  handlecheck() {
    const { currentTask, hasSigned } = this.data;
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!userInfo || !userInfo.class) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    if (!currentTask) {
      wx.showToast({ title: '当前没有有效的签到任务', icon: 'none' });
      return;
    }
    
    if (hasSigned) {
      wx.showModal({
        title: '提示',
        content: '您已经签到过该任务，请勿重复签到',
        showCancel: false
      });
      return;
    }
    
    // 检查任务是否还在有效期内
    const now = new Date();
    const startTime = new Date(currentTask.startTime);
    const endTime = new Date(currentTask.endTime);
    
    if (now < startTime) {
      wx.showModal({
        title: '签到失败',
        content: '签到尚未开始',
        showCancel: false
      });
      return;
    }
    
    if (now > endTime) {
      wx.showModal({
        title: '签到失败',
        content: '签到已结束',
        showCancel: false
      });
      return;
    }
    
    // 获取当前位置
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const distance = getDistance(res.latitude, res.longitude, 
                                  currentTask.latitude, currentTask.longitude);
        
        if (distance > currentTask.range) {
          wx.showModal({
            title: '签到失败',
            content: `您距离签到点${distance.toFixed(0)}米，超出允许范围(${currentTask.range}米)`,
            showCancel: false
          });
        } else {
          // 签到成功
          this.saveSignRecord(currentTask, res.latitude, res.longitude);
        }
      },
      fail: () => {
        wx.showToast({ title: '获取位置失败', icon: 'none' });
      }
    });
  },
  
  saveSignRecord(task, lat, lng) {
    const userInfo = wx.getStorageSync('userInfo');
    const db = wx.cloud.database();
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const second = now.getSeconds().toString().padStart(2, '0');
    const formattedTime = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    
    db.collection('sign_records').add({
      data: {
        className: userInfo.class,
        courseName: task.courseName || '',
        signTime: formattedTime,
        signTimeStamp: now.getTime(),  // ✅ 添加时间戳字段
        location: {
          latitude: lat,
          longitude: lng
        },
        taskId: task._id, // 记录关联的任务ID
        type: '线下签到',
        studentName: userInfo.name || '',
        studentId: userInfo.username || ''
      }
    }).then(() => {
      db.collection('students')
    .where({ _openid: userInfo._openid })
    .update({
      data: {
        score: db.command.inc(1) // 每次签到 +1
      }
    })
    .then(() => {
      this.setData({ hasSigned: true });
      wx.showToast({ 
        title: '签到成功，积分+1！',
        icon: 'success'
      });
    }).catch(() => {
      wx.showToast({
        title: '积分更新失败',
        icon: 'none'
      });
    });
    }).catch(err => {
      console.error('保存签到记录失败', err);
      wx.showToast({ 
        title: '签到失败',
        icon: 'none'
      });
    });
  },
  
  onShareTimeline() {
    return {
      title: "华园签上线啦~",
      imageUrl: '/images/分享.png'
    }
  },
  
  onShareAppMessage() {
    return {
      title: "华园签上线啦~",
      path: "/pages/index/index",
    }
  }
})