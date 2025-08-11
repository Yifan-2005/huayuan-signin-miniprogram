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
    path:"/pages/index/index", //当前转发的页面
    }
  }
})