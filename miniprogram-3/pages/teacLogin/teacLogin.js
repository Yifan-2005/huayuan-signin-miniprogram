const db = wx.cloud.database();
Page({

  data:{
    username:'',
    password:'',
    showResetModal: false,
    resetUsername: '',
    newPassword: '',
    confirmPassword: '',
    showNewPassword: false,
    showConfirmPassword: false,
    showPassword: false
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
 
  handleconfirm(){
    const { username, password } = this.data;

    if (!username || !password) {
      wx.showToast({
        title: '账号和密码不能为空',
        icon: 'none'
      });
      return;
    }

    db.collection('teachers').where({ username }).get().then(res => {
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

          wx.setStorageSync('userInfo', user);

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/teac/teac' 
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

  showResetPasswordModal() {
    this.setData({
      showResetModal: true,
      resetUsername: '',
      newPassword: '',
      confirmPassword: ''
    });
  },

  hideResetPasswordModal() {
    this.setData({
      showResetModal: false
    });
  },

  onNewPasswordInput(e) {
    this.setData({
      newPassword: e.detail.value
    });
  },

  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    });
  },

  toggleNewPasswordVisibility() {
    this.setData({
      showNewPassword: !this.data.showNewPassword
    });
  },

  toggleConfirmPasswordVisibility() {
    this.setData({
      showConfirmPassword: !this.data.showConfirmPassword
    });
  },

  validatePasswordComplexity(password) {
    if (password.length < 6) {
      return { valid: false, message: '密码长度不能少于6位' };
    }
    
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\\/|,.<>?]/.test(password);
    
    const conditionsMet = [hasNumber, hasLetter, hasSpecial].filter(Boolean).length;
    
    if (conditionsMet < 2) {
      return { 
        valid: false, 
        message: '密码必须包含数字、字母、特殊符号中的至少两种' 
      };
    }
    
    return { valid: true };
  },

  resetPassword() {
    const { resetUsername, newPassword, confirmPassword } = this.data;

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

    const passwordValidation = this.validatePasswordComplexity(newPassword);
    if (!passwordValidation.valid) {
      wx.showToast({
        title: passwordValidation.message,
        icon: 'none'
      });
      return;
    }

    db.collection('teachers').where({ username: resetUsername }).get().then(res => {
      if (res.data.length === 0) {
        wx.showToast({
          title: '账号不存在',
          icon: 'none'
        });
        return;
      }

      wx.showLoading({
        title: '正在重置密码',
      });

      wx.cloud.callFunction({
        name: 'resetPassword',
        data: {
          userType: 'teacher',
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