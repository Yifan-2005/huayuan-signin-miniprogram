// custom-tab-bar.js

// 路由标准化函数，确保不带 pages/ 前缀
function normalizeRoute(route) {
  return route.replace(/^pages\//, '');
}

Component({
  data: {
    current: 0,
    tabList: []
  },
  lifetimes: {
    attached() {
      const role = wx.getStorageSync('role');
      if (!role) {
        wx.redirectTo({ url: '/pages/select/select' });
        return;
      }
    
      let tabList = [];
      if (role === 'teacher') {
        tabList = [
          { 
            pagePath: 'pages/signManage/signManage', text: '发布签到',
            iconPath: '/images/发布任务.png',
            selectedIconPath: '/images/发布任务selected.png'
           },
        
          { 
            pagePath: 'pages/teacRecord/teacRecord', text: '签到统计' , 
            iconPath: '/images/签到统计.png',
          selectedIconPath: '/images/签到统计selected.png'},
          { 
            pagePath: 'pages/teac/teac',
             text: '个人',
             iconPath: '/images/个人.png',
            selectedIconPath: '/images/个人selected.png'
           }
        ];
      } else {
        tabList = [
          {
            pagePath: 'pages/index/index',
            text: '首页',
            iconPath: '/images/首页.png',
            selectedIconPath: '/images/首页selected.png'
          },
          {
            pagePath: 'pages/my/my',
            text: '我的',
            iconPath: '/images/我的.png',
            selectedIconPath: '/images/我的selected.png'
          }
        ];
      }

      const pages = getCurrentPages();
      const currentRoute = normalizeRoute(pages[pages.length - 1].route);

      const currentIndex = tabList.findIndex(tab => 
        normalizeRoute(tab.pagePath) === currentRoute
      );

      this.setData({
        tabList,
        current: currentIndex !== -1 ? currentIndex : 0
      });
    }
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const path = this.data.tabList[index].pagePath;
    
      wx.switchTab({
        url: '/' + path,
        success: () => {
      
        },
        fail(err) {
          console.error('❌ 跳转失败：', err);
        }
      });
    }
    
  }
});

