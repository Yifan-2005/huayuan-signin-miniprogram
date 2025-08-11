// app.js
App({
  onLaunch() {
    const update=wx.getUpdateManager()
    update.onUpdateReady(function(){
        wx.showModal({
            title: '发现新版本',
            content: '是否重启应用，更新版本?',
            success:(res)=>{
                if(res.confirm){
                    update.applyUpdate()
                }
            }
        })
    })

    //初始化云能力
    try {
      
    } catch (e) {
      console.error('写入 role 失败', e);
    }
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上基础库');
    } else {
      wx.cloud.init({
        env: 'cloud1-9goltk0ca73fd619',    
        traceUser: true
      });
    }
  }
});
