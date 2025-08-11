Page({
  data: {
    courseList: [],
    loginState: 'loading', // loading, notLogin, noCourse, ok
    teacherInfo: null
  },
  onShow() {
    const teacherInfo = wx.getStorageSync('userInfo');
    if (!teacherInfo) {
      this.setData({ loginState: 'notLogin', courseList: [] });
      return;
    }
    if (Array.isArray(teacherInfo.teaching) && teacherInfo.teaching.length > 0) {
      const courseList = teacherInfo.teaching.map((item, idx) => ({
        id: idx + 1,
        name: item.courseName,
        class: item.className
      }));
      this.setData({ courseList, teacherInfo, loginState: 'ok' });
    } else {
      this.setData({ courseList: [], teacherInfo, loginState: 'noCourse' });
    }
  },
  // 跳转并带参数
  onSelectCourse(e) {
    const courseName = e.currentTarget.dataset.courseName;
    const className  = e.currentTarget.dataset.className;
    wx.navigateTo({
      url: `/pages/typeSelect/typeSelect?courseName=${encodeURIComponent(courseName)}&className=${encodeURIComponent(className)}`
    });
  }
});
