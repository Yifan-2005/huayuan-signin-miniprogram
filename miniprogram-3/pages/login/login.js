const db = wx.cloud.database();
Page({

  data:{
    username:'',
    password:'',
    showPassword: false,
    showResetModal: false,
    resetUsername: '',
    newPassword: '',
    confirmPassword: '',
    showNewPassword: false,
    showConfirmPassword: false
  },
 
  handleconfirm(){
    const { username, password } = this.data;

    if (!username || !password) {
      wx.showToast({
        title: '账号和密码不能为空',
        icon: 'none'
      });
      return;
    }

    db.collection('students').where({ username }).get().then(res => {
      if (res.data.length === 0) {
        wx.showToast({
          title: '账号不存在',
          icon: 'none'
        });
      } else {
        const user = res.data[0];
        if (user.password !== password) {
          wx.showToast({
            title: '密码错误',
            icon: 'none'
          });
        } else {
          wx.showToast({
            title: '登录成功'
          });

          // 缓存用户信息到本地
          wx.setStorageSync('userInfo', user);

          // 返回“我的”页面
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/my/my' 
            });
          }, 1000);
        }
      }
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
    path:"/pages/index/index", //当前转发的页面
  }
  },
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },
  
  togglePasswordVisibility() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  //显示重置密码弹窗
  showResetPasswordModal() {
    this.setData({
      showResetModal: true,
      resetUsername: '',
      newPassword: '',
      confirmPassword: ''
    });
  },

  //隐藏重置密码弹窗
  hideResetPasswordModal() {
    this.setData({
      showResetModal: false
    });
  },

  //新密码输入处理
  onNewPasswordInput(e) {
    this.setData({
      newPassword: e.detail.value
    });
  },

  //确认密码输入处理
  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    });
  },

  //切换新密码可见性
  toggleNewPasswordVisibility() {
    this.setData({
      showNewPassword: !this.data.showNewPassword
    });
  },

  //切换确认密码可见性
  toggleConfirmPasswordVisibility() {
    this.setData({
      showConfirmPassword: !this.data.showConfirmPassword
    });
  },

  //验证密码复杂度
  validatePasswordComplexity(password) {
    //检查长度
    if (password.length < 6) {
      return { valid: false, message: '密码长度不能少于6位' };
    }
    
    //检查是否包含数字
    const hasNumber = /\d/.test(password);
    //检查是否包含字母
    const hasLetter = /[a-zA-Z]/.test(password);
    //检查是否包含特殊符号
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\\/|,.<>?]/.test(password);
    
    // 计算满足的条件数量
    const conditionsMet = [hasNumber, hasLetter, hasSpecial].filter(Boolean).length;
    
    if (conditionsMet < 2) {
      return { 
        valid: false, 
        message: '密码必须包含数字、字母或特殊符号中的至少两种' 
      };
    }
    
    return { valid: true };
  },

  //重置密码
  resetPassword() {
    const { resetUsername, newPassword, confirmPassword } = this.data;

    //表单验证
    if (!resetUsername || !newPassword || !confirmPassword) {
      wx.showToast({
        title: '请填写所有字段',
        icon: 'none'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      wx.showToast({
        title: '两次输入的密码不一致',
        icon: 'none'
      });
      return;
    }

    //密码复杂度验证
    const passwordValidation = this.validatePasswordComplexity(newPassword);
    if (!passwordValidation.valid) {
      wx.showToast({
        title: passwordValidation.message,
        icon: 'none'
      });
      return;
    }

    //验证账号是否存在
    db.collection('students').where({ username: resetUsername }).get().then(res => {
      if (res.data.length === 0) {
        wx.showToast({
          title: '账号不存在',
          icon: 'none'
        });
        return;
      }

      //调用云函数重置密码
      wx.showLoading({
        title: '正在重置密码',
      });

      wx.cloud.callFunction({
        name: 'resetPassword',
        data: {
          userType: 'student',
          username: resetUsername,
          newPassword: newPassword
        }
      }).then(res => {
        wx.hideLoading();
        const result = res.result;
        
        if (result.success) {
          wx.showToast({
            title: '密码重置成功',
            icon: 'success'
          });
          this.hideResetPasswordModal();
        } else {
          wx.showToast({
            title: result.message || '密码重置失败',
            icon: 'none'
          });
        }
      }).catch(err => {
        wx.hideLoading();
        console.error('重置密码失败', err);
        wx.showToast({
          title: '系统错误，请稍后再试',
          icon: 'none'
        });
      });
    });
  }
})