const QQMapWX = require('../../utils/qqmap-wx-jssdk.min.js');
const qqmapsdk = new QQMapWX({
  key: 'OLLBZ-F6VKN-PVEFW-SUMTC-2HSZ6-JZBGC'
});

Page({
  data: {
    className: '',
    courseName: '',
    locationText: '未获取位置',
    location: null,
    rangeOptions: [50, 200, 500],
    selectedRangeIndex: 0,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: ''
  },

  onLoad(options) {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;
    const currentTime = `${hours}:${minutes}`;
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const endHours = endTime.getHours().toString().padStart(2, '0');
    const endMinutes = endTime.getMinutes().toString().padStart(2, '0');

    this.setData({
      className: decodeURIComponent(options.className || ''),
      courseName: decodeURIComponent(options.courseName || ''),
      startDate: currentDate,
      startTime: currentTime,
      endDate: currentDate,
      endTime: `${endHours}:${endMinutes}`
    });
  },

  onRangeChange(e) {
    this.setData({
      selectedRangeIndex: e.detail.value
    });
  },
  onStartDateChange(e) { this.setData({ startDate: e.detail.value }); },
  onStartTimeChange(e) { this.setData({ startTime: e.detail.value }); },
  onEndDateChange(e)   { this.setData({ endDate: e.detail.value }); },
  onEndTimeChange(e)   { this.setData({ endTime: e.detail.value }); },

  requestLocation() {
    wx.getSetting({
      success: res => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => this._doGetLocation(),
            fail: () => {
              wx.showModal({
                title: '需要定位权限',
                content: '请到系统设置中打开定位权限',
                confirmText: '去设置',
                success: modal => modal.confirm && wx.openSetting()
              });
            }
          });
        } else {
          this._doGetLocation();
        }
      }
    });
  },
  
  _doGetLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: loc => {
        qqmapsdk.reverseGeocoder({
          location: {
            latitude: loc.latitude,
            longitude: loc.longitude
          },
          success: resp => {
            this.setData({
              location: loc,
              locationText: resp.result.address
            });
          },
          fail: () => {
            wx.showToast({ title: '地址解析失败', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.showToast({ title: '定位失败，请检查权限', icon: 'none' });
      }
    });
  },

  submitSign() {
    const { className, courseName, location, locationText, rangeOptions, selectedRangeIndex, 
          startDate, startTime, endDate, endTime } = this.data;

    if (!className || !courseName) {
      return wx.showToast({ title: '班级或课程不能为空', icon: 'none' });
    }
    if (!location) {
      return wx.showToast({ title: '请先获取位置', icon: 'none' });
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      return wx.showToast({ title: '请选择时间', icon: 'none' });
    }

    const startDateTime = new Date(`${startDate} ${startTime}`);
    const endDateTime = new Date(`${endDate} ${endTime}`);
    const now = new Date();
    
    if (endDateTime <= startDateTime) {
      return wx.showToast({ title: '结束时间需晚于开始时间', icon: 'none' });
    }
    if (endDateTime <= now) {
      return wx.showToast({ title: '结束时间需晚于当前时间', icon: 'none' });
    }

    wx.showLoading({ title: '发布中…' });

    const db = wx.cloud.database();
    db.collection('sign_tasks').add({
      data: {
        className,
        courseName,
        locationText,
        latitude: location.latitude,
        longitude: location.longitude,
        range: rangeOptions[selectedRangeIndex],
        startTime: `${startDate} ${startTime}`,
        endTime: `${endDate} ${endTime}`,
        createdAt: db.serverDate(),
        status: 'active' // 新增状态字段
      }
    })
    .then(res => {
      wx.hideLoading();
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 1500,
        success: () => {
          setTimeout(() => {
            wx.redirectTo({
              url: `/pages/signManage/signManage`
            });
          }, 1200); // 等 Toast 显示 1.2 秒后跳转，防止太快
        }
      });
    })
    
    .catch(err => {
      console.error('新增签到任务失败', err);
      wx.hideLoading();
      wx.showToast({ title: '发布失败', icon: 'none' });
    });
  } 
});
