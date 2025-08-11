Page({

  data: {

  },
  handleregister(){
    wx.setStorageSync('role', 'student'); // 保存为学生
    wx.navigateTo({
      url: '/pages/register/register' 
    });
  },
  handletregister(){
    wx.setStorageSync('role', 'teacher'); // 保存为老师
    wx.navigateTo({
      url: '/pages/teacRegister/teacRegister' 
    });
  },
  onShareTimeline(){
    return {
        title:"华园签上线啦~",
        imageUrl:'/images/分享.png'
    }
  },
  onShareAppMessage() {
    
  return {
    title:"华园签上线啦~",
    path:"/pages/select/select", 
  }
  }
})