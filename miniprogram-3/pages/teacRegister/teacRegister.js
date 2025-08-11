const db = wx.cloud.database();

Page({
  data: {
    username: '',
    password: '',
    name: '',
    mobile: '',
    photo: '/images/默认头像.png',
    teachingOptions: [], // [{className, courseName}]
    teaching: [],        // [{className, courseName}]
    showTeachingPicker: false,
    teachingTemp: [],     // ["className|courseName", ...]
    showPassword: false
  },

  onLoad() {
    db.collection('classlist').get().then(res => {
      const options = [];
      res.data.forEach(item => {
        (item.courses || []).forEach(courseName => {
          options.push({
            className: item.className,
            courseName
          });
        });
      });
      this.setData({ teachingOptions: options });
    }).catch(() => {
      wx.showToast({ title: '读取班级/课程失败', icon: 'none' });
    });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [key]: e.detail.value });
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

  openTeachingPicker() {
    //teachingTemp = teaching 映射回 ["className|courseName", ...]
    this.setData({
      showTeachingPicker: true,
      teachingTemp: this.data.teaching.map(item => item.className + '|' + item.courseName)
    });
  },
  closeTeachingPicker() {
    this.setData({ showTeachingPicker: false });
  },
  //checkbox-group自动维护value
  onTeachingCheck(e) {
    this.setData({ teachingTemp: e.detail.value });
  },
  confirmTeachingPicker() {
    const newTeachingArr = this.data.teachingTemp.map(str => {
      const [className, courseName] = str.split('|');
      return { className, courseName };
    });
    // 合并去重
    const teachingArr = [...this.data.teaching, ...newTeachingArr];
    this.setData({ teaching: teachingArr, showTeachingPicker: false, teachingTemp: [], unselectedOptions: [] });
  },
  
  handlere(){
    wx.navigateTo({
      url: '/pages/teacLogin/teacLogin',
    })
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

  handleconfirm() {
    const { username, password, name, mobile, teaching, photo } = this.data;
    if (!username || !password || !name || !mobile) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    // 密码复杂度验证
    const passwordValidation = this.validatePasswordComplexity(password);
    if (!passwordValidation.valid) {
      wx.showToast({
        title: passwordValidation.message,
        icon: 'none'
      });
      return;
    }
    db.collection('teachers').where({ username }).get().then(res => {
      if (res.data.length > 0) {
        wx.showToast({ title: '账号名已存在', icon: 'none' });
      } else {
        db.collection('teachers').add({
          data: {
            username,
            password,
            name,
            mobile,
            teaching,
            avatar: photo, // 头像fileID存储为avatar字段
            createTime: db.serverDate()
          }
        }).then(() => {
          wx.showToast({ title: '注册成功', icon: 'success' });
          setTimeout(() => {
            wx.showToast({ title: '正在前往登录', icon: 'loading' });
          }, 800);
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/teacLogin/teacLogin' 
            });
          }, 1000);
        }).catch(() => {
          wx.showToast({ title: '注册失败', icon: 'none' });
        });
      }
    });
  },
  
  chooseAvatar() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const filePath = res.tempFilePaths[0];
        // 生成唯一文件名，建议使用用户id+时间戳等
        const cloudPath = 'avatars/' + Date.now() + '-' + Math.floor(Math.random() * 10000) + filePath.match(/\.[^.]+?$/)[0];
        wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: uploadRes => {
            // 上传后获取文件云存储id
            that.setData({
              photo: uploadRes.fileID // 直接保存云端 fileID
            });
            wx.showToast({ title: '头像已更新', icon: 'success' });
          },
          fail: e => {
            wx.showToast({ title: '上传失败', icon: 'none' });
          }
        });
      }
    });
  },
  openTeachingPicker() {
    // 计算可选项
    const selectedSet = new Set(this.data.teaching.map(item => item.className + '|' + item.courseName));
    const unselectedOptions = this.data.teachingOptions.filter(opt =>
      !selectedSet.has(opt.className + '|' + opt.courseName)
    );
    this.setData({
      showTeachingPicker: true,
      teachingTemp: [],
      unselectedOptions // 新增字段
    });
  }
  
  
});
