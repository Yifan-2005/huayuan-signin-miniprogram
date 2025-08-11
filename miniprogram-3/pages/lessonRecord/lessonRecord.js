Page({
  data: {
    courseName: '',
    className: '',
    signTasks: [],    // 普通签到任务
    videoTasks: [],   // 视频签到任务
    loading: true
  },

  onLoad(options) {
    wx.setStorageSync('role', 'teacher');
    const courseName = decodeURIComponent(options.courseName || '');
    const className  = decodeURIComponent(options.className  || '');
    this.setData({ courseName, className }, () => {
      this.loadTasks();
    });
  },

  async loadTasks() {
    this.setData({ loading: true });
    const db = wx.cloud.database({ env: 'cloud1-9goltk0ca73fd619' });

    try {
      // 只查 sign_tasks，根据 type 字段或 videoFileID 区分
      const res = await db.collection('sign_tasks')
        .where({
          courseName: this.data.courseName,
          className: this.data.className
        })
        .orderBy('createdAt', 'desc')
        .get();

      // 分类
      const signTasks = [];
      const videoTasks = [];
      res.data.forEach(item => {
        // 兼容无type字段的旧数据：有 videoFileID 则为视频签到，否则为普通
        if (item.type === '线上签到' || item.videoFileID) {
          videoTasks.push({
            ...item,
            createdAt: this.formatDate(item.createdAt),
            startTime: item.startTime,
            endTime: item.endTime
          });
        } else {
          signTasks.push({
            ...item,
            createdAt: this.formatDate(item.createdAt),
            startTime: item.startTime,
            endTime: item.endTime
          });
        }
      });

      this.setData({
        signTasks,
        videoTasks,
        loading: false
      });
    } catch (err) {
      console.error('加载任务出错：', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 线下签到
  onSelectTask(e) {
    const signId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/oneRecord/oneRecord?signId=${signId}&type=sign`
    });
  },
  // 视频签到
  onSelectVideo(e) {
    const signId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/oneRecord/oneRecord?signId=${signId}&type=video`
    });
  },

  formatDate(ts) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
    const Y = date.getFullYear();
    const M = String(date.getMonth() + 1).padStart(2, '0');
    const D = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${Y}/${M}/${D} ${h}:${m}`;
  },

  totRecord() {
    wx.navigateTo({
      url: `/pages/totRecord/totRecord?courseName=${encodeURIComponent(this.data.courseName)}&className=${encodeURIComponent(this.data.className)}`
    });
  }
});
