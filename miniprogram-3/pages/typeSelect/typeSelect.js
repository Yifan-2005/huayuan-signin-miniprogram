Page({
  // 线上签到
  handleregister() {
    const { courseName, className } = this.options;
    wx.navigateTo({
      url: `/pages/video/video?courseName=${encodeURIComponent(courseName)}&className=${encodeURIComponent(className)}`
    });
  },
  // 线下签到
  handletregister() {
    const { courseName, className } = this.options;
    wx.navigateTo({
      url: `/pages/publish/publish?courseName=${encodeURIComponent(courseName)}&className=${encodeURIComponent(className)}`
    });
  },
  onLoad(options) {
    // 解码并保存参数
    this.options = {
      courseName: decodeURIComponent(options.courseName || ''),
      className: decodeURIComponent(options.className || '')
    };
 
    this.setData({
      courseName: this.options.courseName,
      className: this.options.className
    });
    console.log('typeSelect onLoad:', this.options);
  }
});
