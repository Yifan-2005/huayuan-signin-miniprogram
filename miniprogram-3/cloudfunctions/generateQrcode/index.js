// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event) => {
  const { signId } = event;
  // 生成二维码：scene 携带 signId，跳到学生扫码页 pages/studentSign/studentSign
  const result = await cloud.openapi.wxacode.getUnlimited({
    scene: signId,
    page: 'pages/studentSign/studentSign',
    width: 280
  });
  // 把返回的 buffer 上传到云存储
  const uploadRes = await cloud.uploadFile({
    cloudPath: `qrcodes/${signId}.png`,
    fileContent: result.buffer
  });
  return {
    fileID: uploadRes.fileID
  };
};
