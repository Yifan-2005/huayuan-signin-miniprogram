const app = getApp();

Page({
  data: {
    userInfo: null,
    signTasks: []
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
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
    
    this.setData({ userInfo });
    
    //清除本地缓存的签到任务和记录，确保每次登录都重新加载
    wx.removeStorageSync('signTasks');
    
    //从云数据库加载签到任务
    this.loadTasksFromCloud();
  },

  onShow() {
    //检查用户是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.class) return;

    //检查是否有签到成功的标记
    const signSuccessFlag = wx.getStorageSync('signSuccessFlag');
    
    if (signSuccessFlag) {
      console.log('检测到签到成功标记，从云数据库重新加载任务');
      
      //清除标记
      wx.removeStorageSync('signSuccessFlag');
      
      //从云数据库重新加载任务，确保数据是最新的
      this.loadTasksFromCloud();
      return; 
    }

    //无论是否有签到标记，都更新状态
    this.updateSignStatus();
  },

  //从云数据库加载签到任务
  loadTasksFromCloud() {
    const userInfo = this.data.userInfo;
    if (!userInfo || !userInfo.class) return;
    
    wx.showLoading({ title: '加载任务中...' });
    
    const db = wx.cloud.database();
    const _ = db.command;
    
    db.collection('sign_tasks')
      .where({
        className: userInfo.class,
        type: '线上签到'
      })
      .orderBy('createdAt', 'desc')
      .get()
      .then(res => {
        wx.hideLoading();
        
        if (res.data && res.data.length > 0) {
          console.log('从云数据库加载到签到任务:', res.data);
          
          //格式化任务数据
          const tasks = res.data.map(task => {
            let startDateTime = null;
            let endDateTime = null;
            
            if (task.startTime) {
              startDateTime = new Date(task.startTime);
            } else if (task.createdAt) {
              startDateTime = new Date(task.createdAt);
            }
            
            if (task.endTime) {
              endDateTime = new Date(task.endTime);
            }
            
            return {
              id: task._id,
              title: task.title || '线上签到任务',
              desc: task.desc || '观看视频并回答问题完成签到',
              date: startDateTime,  
              endDate: endDateTime, 
              startTimeStr: task.startTime, 
              endTimeStr: task.endTime,     
              status: task.status || '未开始'
            };
          });
          
          //存储到本地和状态
          this.setData({ signTasks: tasks });
          wx.setStorageSync('signTasks', tasks);
        } else {
          console.log('没有找到线上签到任务，显示空列表');
          
          //如果没有找到任务，显示空列表
          const emptyTasks = [];
          this.setData({ signTasks: emptyTasks });
          wx.setStorageSync('signTasks', emptyTasks);
        }
        
        //更新签到状态
        this.updateSignStatus();
      })
      .catch(err => {
        wx.hideLoading();
        console.error('加载签到任务失败:', err);
        
        const emptyTasks = [];
        this.setData({ signTasks: emptyTasks });
        wx.setStorageSync('signTasks', emptyTasks);
        
        wx.showToast({
          title: '加载任务失败',
          icon: 'none',
          duration: 2000
        });
        
        this.updateSignStatus();
      });
  },
  
  updateSignStatus() {
    const userInfo = this.data.userInfo;
    if (!userInfo || !userInfo.class || !userInfo._openid) return;
    
    let updatedTasks = [...this.data.signTasks].map(task => {
      //保存原始任务对象，确保所有字段都保留
      const updatedTask = { ...task };
      
      //重新计算状态，而不使用缓存的状态
      const now = new Date();
      
      let startDateTime = null;
      let endDateTime = null;
      
      if (task.startTimeStr) {
        startDateTime = new Date(task.startTimeStr);
      } else if (task.date instanceof Date) {
        startDateTime = task.date;
      }
      
      if (task.endTimeStr) {
        endDateTime = new Date(task.endTimeStr);
      } else if (task.endDate instanceof Date) {
        endDateTime = task.endDate;
      }
      
      if (!startDateTime || isNaN(startDateTime.getTime())) {
        console.error('任务开始时间无效:', task);
        updatedTask.status = '时间错误';
        return updatedTask;
      }
      
      if (!endDateTime || isNaN(endDateTime.getTime())) {
        console.error('任务结束时间无效:', task);
        updatedTask.status = '时间错误';
        return updatedTask;
      }
      
      console.log('判断任务状态:', {
        任务ID: task.id,
        当前时间: now.toLocaleString(),
        开始时间: startDateTime.toLocaleString(),
        结束时间: endDateTime.toLocaleString()
      });
      
      //根据时间比较设置状态
      if (endDateTime < now) {
        //将已过期的任务标记为“未签到”，这样可以避免被阻止跳转
        //这样可以避免被阻止跳转
        updatedTask.status = '未签到';
        updatedTask.isExpired = true;
      } else if (startDateTime > now) {
        updatedTask.status = '未开始';
      } else {
        updatedTask.status = '未签到';
      }
      
      return updatedTask;
    });
    
    //检查云数据库中的签到记录
  const db = wx.cloud.database();

  db.collection('sign_records')
    .where({
      _openid: userInfo._openid,
      type: '线上签到'
    })
    .orderBy('signTimeStamp', 'desc')
    .get()
    .then(res => {
      if (res.data.length > 0) {
        console.log('找到签到记录:', res.data);

        //如果有签到记录，根据任务ID判断是否已签到
        updatedTasks = updatedTasks.map(task => {
          const taskIdStr = task.id ? task.id.toString() : '';

          const hasSignedThisTask = res.data.some(record => {
            const recordTaskId = record.taskId ? record.taskId.toString() : '';
            const isMatch = recordTaskId === taskIdStr;
            console.log('比较:', recordTaskId, taskIdStr, '类型:', typeof recordTaskId, typeof taskIdStr, isMatch ? '匹配' : '不匹配');
            return isMatch;
          });

          //保存原始任务对象，确保所有字段都保留
          const updatedTask = { ...task };

          //如果已签到，直接设置状态为已签到
          if (hasSignedThisTask) {
            updatedTask.status = '已签到';
          }
          
          return updatedTask;
        });
      }

      this.setData({ signTasks: updatedTasks });
      wx.setStorageSync('signTasks', updatedTasks);
    })
    .catch(err => {
      console.error('获取签到记录失败', err);
      this.setData({ signTasks: updatedTasks });
      wx.setStorageSync('signTasks', updatedTasks);
    });
},

  goToSignPage(e) {
    const taskId = e.currentTarget.dataset.id;
    if (!taskId) {
      wx.showToast({
        title: '任务ID无效',
        icon: 'none'
      });
      return;
    }
    
    //查找当前任务
    const task = this.data.signTasks.find(t => t.id == taskId);
    if (!task) {
      wx.showToast({
        title: '未找到任务信息',
        icon: 'none'
      });
      return;
    }
    
    console.log('点击任务:', task);
    
    //检查任务状态
    const statusMessages = {
      '未开始': { title: '任务未开始', content: '该签到任务尚未开始，请在开始时间后再进行签到。' }
    };
    
    //如果是特殊状态，显示提示并阻止跳转
    const statusMsg = statusMessages[task.status];
    if (statusMsg) {
      wx.showModal({
        title: statusMsg.title,
        content: statusMsg.content,
        showCancel: false
      });
      return;
    }
    
    //先检查任务是否存在
    wx.showLoading({ title: '检查任务...' });
    
    const db = wx.cloud.database();
    db.collection('sign_tasks').doc(taskId).get()
      .then(res => {
        wx.hideLoading();
        if (res.data) {
          //任务存在，跳转到签到页面
          wx.navigateTo({ 
            url: `/pages/online/online?id=${taskId}`,
            success: () => {
              console.log('跳转到线上签到页面成功');
            },
            fail: (err) => {
              console.error('跳转失败:', err);
              wx.showToast({
                title: '跳转失败，请重试',
                icon: 'none'
              });
            }
          });
        } else {
          //任务不存在
          wx.showToast({
            title: '任务不存在或已被删除',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('检查任务失败:', err);
        
        //如果检查失败，仍然尝试跳转
        wx.navigateTo({ 
          url: `/pages/online/online?id=${taskId}`,
        });
      });
  },

  onPullDownRefresh() {
    this.updateSignStatus();
    wx.stopPullDownRefresh();
  }
});