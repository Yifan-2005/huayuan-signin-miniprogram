const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    username: '',
    password: '',
    name: '',
    photo: '/images/默认头像.png',
    classList: [],
    selectedClass: '',
    showPassword: false
  },

  onLoad() {
    db.collection('classlist').get().then(res => {
      const classNames = res.data.map(item => item.className);
      this.setData({ classList: classNames });
    }).catch(err => {
      console.error('加载班级失败', err);
    });
  },

  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
  
        wx.cloud.uploadFile({
          cloudPath: 'avatars/' + Date.now() + '.png', // 上传路径
          filePath: tempFilePath,
          success: uploadRes => {
            this.setData({
              photo: uploadRes.fileID  // 存储 cloud 文件ID
            });
          },
          fail: err => {
            console.error('头像上传失败:', err);
            wx.showToast({ title: '头像上传失败', icon: 'none' });
          }
        });
      }
    });
  },

  chooseClass(e) {
    const index = e.detail.value;
    this.setData({
      selectedClass: this.data.classList[index]
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

  handleconfirm() {
    const { username, password, photo, selectedClass, name } = this.data;
  
    if (!username || !password || !photo || !selectedClass || !name) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    
    const passwordValidation = this.validatePasswordComplexity(password);
    if (!passwordValidation.valid) {
      wx.showToast({
        title: passwordValidation.message,
        icon: 'none'
      });
      return;
    }
  
    db.collection('class').where({ className: selectedClass }).get().then(classRes => {
      if (classRes.data.length === 0) {
        wx.showToast({ title: '班级未找到', icon: 'none' });
        return;
      }
  
      const classId = classRes.data[0]._id;
  
      //先读取 class 文档，确保 students 字段是数组
      db.collection('class').doc(classId).get().then(classDoc => {
        let studentsArr = classDoc.data.students;
        if (!Array.isArray(studentsArr)) {
          //如果不是数组，先初始化为空数组，防止后续 push 失败
          db.collection('class').doc(classId).update({
            data: {
              students: []
            }
          }).then(() => {
            proceedAddStudent();
          }).catch(err => {
            console.error('初始化 students 数组失败', err);
            wx.showToast({ title: '初始化班级数据失败', icon: 'none' });
          });
        } else {
          proceedAddStudent();
        }
  
        function proceedAddStudent() {
          //检查用户名是否重复
          db.collection('students').where({ username }).get().then(res => {
            if (res.data.length > 0) {
              wx.showToast({ title: '账号名已存在', icon: 'none' });
            } else {
              //添加学生
              db.collection('students').add({
                data: {
                  username,
                  password,
                  avatar: photo,
                  class: selectedClass,
                  name,
                  score: 0,
                  createTime: db.serverDate()
                }
              }).then(() => {
                //更新班级 students 数组
                db.collection('class').doc(classId).update({
                  data: {
                    students: _.push({
                      name,
                      username
                    })
                  }
                }).then(() => {
                  wx.showToast({ title: '注册成功', icon: 'success' });
                  
                  setTimeout(() => {
                    wx.showToast({ title: '正在前往登录', icon: 'loading' });
                  }, 800);
                  setTimeout(() => {
                    wx.navigateTo({
                      url: '/pages/login/login' 
                    });
                  }, 1000);
                }).catch(err => {
                  console.error('更新 class students 失败:', err);
                  wx.showToast({ title: '班级写入失败', icon: 'none' });
                });
              }).catch(err => {
                console.error('添加学生失败:', err);
                wx.showToast({ title: '注册失败', icon: 'none' });
              });
            }
          }).catch(err => {
            console.error('查询用户名失败:', err);
            wx.showToast({ title: '查询账号出错', icon: 'none' });
          });
        }
  
      }).catch(err => {
        console.error('获取班级文档失败:', err);
        wx.showToast({ title: '获取班级数据失败', icon: 'none' });
      });
  
    }).catch(err => {
      console.error('查询班级失败:', err);
      wx.showToast({ title: '查询班级出错', icon: 'none' });
    });
  },
  handlere(){
    wx.navigateTo({
      url: '/pages/login/login',
    })
  },

  onShareTimeline() {
    return {
      title: "华园签上线啦~",
      imageUrl: '/images/分享.png'
    };
  },

  onShareAppMessage() {
    return {
      title: "华园签上线啦~",
      path: "/pages/index/index"
    };
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
  }
});
