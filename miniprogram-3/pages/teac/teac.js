const db = wx.cloud.database();

Page({
  data: {
    control: 0,
    userInfo: {},
    showAddCourseModal: false,
    classOptions: [],         // [{className, courses: []}]
    selectedClass: '',
    newCourseName: ''
  },

  handleback() {
    wx.removeStorageSync('userInfo');
    this.setData({
      control: 0,
      userInfo: {}
    });
    wx.showToast({
      title: '已退出登录'
    });
  },
  handlelogin(){
    wx.navigateTo({
      url: '/pages/teacLogin/teacLogin',
    });
  },
  handlechange(){
    wx.navigateTo({
      url: '/pages/select/select',
    });
  },
  handleregister(){
    wx.navigateTo({
      url: '/pages/teacRegister/teacRegister',
    });
  },
  onShareTimeline(){
    return {
      title:"华园签上线啦~",
      imageUrl:'/images/分享.png'
    };
  },
  onShareAppMessage() {
    return {
      title:"华园签上线啦~",
      path:"/pages/index/index",
    };
  },
  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.username) {
      this.setData({
        control: 1,
        userInfo
      });

      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({
          current: 2  
        });
      }
    } else {
      this.setData({
        control: 0,
        userInfo: {}
      });
    }
  },

  // === 添加课程相关 ===
  openAddCourseModal() {
    db.collection('classlist').get().then(res => {
      this.setData({
        classOptions: res.data,
        selectedClass: res.data.length > 0 ? res.data[0].className : '',
        newCourseName: '',
        showAddCourseModal: true
      });
    });
  },
  closeAddCourseModal() {
    this.setData({ showAddCourseModal: false });
  },
  onSelectClass(e) {
    this.setData({
      selectedClass: this.data.classOptions[e.detail.value].className
    });
  },
  onInputNewCourse(e) {
    this.setData({ newCourseName: e.detail.value });
  },
  confirmAddCourse() {
    const { selectedClass, newCourseName, classOptions, userInfo } = this.data;
    if (!selectedClass || !newCourseName.trim()) {
      wx.showToast({ title: '请选择班级并输入课程名', icon: 'none' });
      return;
    }
    // 查询当前班级记录
    db.collection('classlist').where({ className: selectedClass }).get().then(res => {
      if (!res.data.length) {
        wx.showToast({ title: '班级不存在', icon: 'none' });
        return;
      }
      const record = res.data[0];
      const courses = record.courses || [];
      if (courses.includes(newCourseName.trim())) {
        wx.showToast({ title: '课程已存在', icon: 'none' });
        return;
      }
      courses.push(newCourseName.trim());
      db.collection('classlist').doc(record._id).update({
        data: { courses }
      }).then(() => {
        // ==== 新增：同步到教师的 teaching 字段 ====
        const newTeachItem = { className: selectedClass, courseName: newCourseName.trim() };
        // 查询当前教师
        db.collection('teachers').where({ username: userInfo.username }).get().then(teacherRes => {
          if (!teacherRes.data.length) return;
          const teacher = teacherRes.data[0];
          const teachingArr = teacher.teaching || [];
          // 防止重复
          const exists = teachingArr.some(item => item.className === selectedClass && item.courseName === newCourseName.trim());
          if (!exists) {
            teachingArr.push(newTeachItem);
            db.collection('teachers').doc(teacher._id).update({
              data: { teaching: teachingArr }
            }).then(() => {
              // 本地 userInfo 也同步一下
              const newUserInfo = { ...userInfo, teaching: teachingArr };
              wx.setStorageSync('userInfo', newUserInfo);
              this.setData({ userInfo: newUserInfo });
            });
          }
        });
        wx.showToast({ title: '课程添加成功', icon: 'success' });
        this.setData({ showAddCourseModal: false });
      });
    });
  }
  
});
