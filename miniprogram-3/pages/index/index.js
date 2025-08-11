// function normalizeRoute(route) {
//   return route.replace(/^pages\//, '');
// }
Page({
  onShow() {
    // const tabBar = this.getTabBar && this.getTabBar();
    // if (tabBar && typeof tabBar.setData === 'function') {
    //   const route = getCurrentPages().slice(-1)[0].route;
    //   const tabIndex = tabBar.data.tabList.findIndex(tab => tab.pagePath === route);
      
    //   if (tabIndex !== -1) {
    //     tabBar.setData({ current: tabIndex });
    //   }
    // }
  },
  
  onLoad() {
    // 强制把身份设为 student，后面所有地方取 storage 都是 student
    wx.setStorageSync('role', 'student');
    
  },
  handleoffline(){
    wx.navigateTo({
      url: '/pages/offline/offline',
    })
  },
  handleonline(){
    wx.navigateTo({
      url: '/pages/online_list/online_list',
    })
  },
  handlerecord(){
    wx.navigateTo({
      url: '/pages/record/record',
    })
  },
  handleelse(){
    wx.navigateTo({
      url: '/pages/else/else',
    })
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
    path:"/pages/index/index", //当前转发的页面
    // 默认转发现在界面的图片
  }
}
})
