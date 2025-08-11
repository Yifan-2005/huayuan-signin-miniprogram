const db = wx.cloud.database();

Page({
  data: {
    control: 0,
    userInfo: {},
    loading: true  // 新增loading标志
  },

  onShow() {
    const localInfo = wx.getStorageSync('userInfo');
    if (localInfo && localInfo.username) {
      db.collection('students')
        .where({ username: localInfo.username })
        .get()
        .then(res => {
          if (res.data.length > 0) {
            const info = res.data[0];
            this.setData({
              control: 1,
              userInfo: {
                avatar: info.avatar,
                name: info.name,
                class: info.class,
                score: info.score,
                username: info.username
              }
            });
          } else {
            this.setData({ control: 0 });
          }
          this.setData({ loading: false });
        }).catch(() => {
          this.setData({ control: 0, loading: false });
        });
    } else {
      this.setData({ control: 0, loading: false });
    }
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

  handlelogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  handleregister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  handlechange() {
    wx.navigateTo({
      url: '/pages/select/select'
    });
  },

  showUsername() {
    wx.showModal({
      title: '账号信息',
      content: `学号：${this.data.userInfo.username}`,
      confirmText: '复制',
      showCancel: false,
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: this.data.userInfo.username,
            success: () => {
              wx.showToast({ title: '已复制账号' });
            }
          });
        }
      }
    });
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
