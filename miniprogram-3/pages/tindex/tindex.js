// pages/tindex/tindex.js
Page({

  data: {

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
    path:"/pages/select/select", //当前转发的页面
    // imageUrl:'/images/b.jpg'
  }
  }
})