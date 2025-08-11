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
    if (teacherInfo && Array.isArray(teacherInfo.teaching) && teacherInfo.teaching.length) {
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
  onSelectCourse(e) {
    const courseName = e.currentTarget.dataset.course;
    const className  = e.currentTarget.dataset.class;
    wx.navigateTo({
      url: `/pages/lessonRecord/lessonRecord?courseName=${encodeURIComponent(courseName)}&className=${encodeURIComponent(className)}`
    });
  }
});
