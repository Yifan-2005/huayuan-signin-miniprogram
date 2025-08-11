# 华园签 · 校园签到小程序

> 基于 **微信小程序 + CloudBase** 的签到/考勤系统，支持**线下定位签到**与**线上视频签到（含随机题目防挂机）**，覆盖学生端与教师端完整流程。  
> 个人角色：**黄一帆**（架构设计 & 学生端签到记录实现）

---

## 🚀 预览

**学生端首页**  
![学生端首页](docs/images/student-home.png)

**签到记录时间线**  
![签到记录时间线](docs/images/timeline.png)

**教师端统计页面**  
![教师端统计](docs/images/teacher-stats.png)

---

## ✨ 主要功能

- **学生端**
  - 注册 / 登录
  - 线下定位签到（地理围栏判断）
  - 线上视频签到（关键帧出题 + 校验）
  - 签到记录时间线（实时刷新、去重）
- **教师端**
  - 注册 / 登录
  - 发布签到任务（线下 / 线上）
  - 任务统计（总统计 / 单次统计）
- **数据层**
  - CloudBase NoSQL 数据库
  - 集合：`students`、`class`、`sign_tasks`、`sign_record`

---

## 🧱 技术栈

- **前端**：WXML / WXSS / JavaScript（微信小程序 API）
- **后端**：微信云开发 CloudBase（云函数 + 数据库直连 API）
- **数据库**：CloudBase NoSQL
- **位置 / 地图 API**：`wx.getLocation`、腾讯地图 SDK

---

## 📂 目录结构

```text
miniprogram-3/
  pages/
    index/           # 学生端首页
    timeline/        # 签到记录时间线
    ...
  custom-tab-bar/
  utils/
  images/
cloudfunctions/
  ...
docs/
  PROJECT_OVERVIEW.md
  STAR-黄一帆.md
  RESUME_BULLETS.md
project.config.json
sitemap.json
.gitignore
```

---

## ⚡ 本地运行

1. 打开 **微信开发者工具** → 导入 `miniprogram-3/` 工程
2. 绑定云开发环境（CloudBase），初始化数据库集合：
   ```
   students
   class
   sign_tasks
   sign_record
   ```
3. 开启定位权限
4. 教师端创建任务 → 学生端在时间窗内完成签到

---

## 🧑‍💻 我的贡献（黄一帆）

- **云函数 → 数据库直连 API 架构优化**：减少调用链，提升迭代效率
- **学生端「签到记录」时间线**：状态机设计（未开始 / 未签到 / 已签到 / 已过期）、实时刷新、去重
- **线上签到防挂机机制**：视频播放关键帧弹题、答题校验、次数限制
- **团队协作规范**：接口文档、集合结构说明、敏感配置管理

详见：[docs/STAR-黄一帆.md](docs/STAR-黄一帆.md)

---

## 📌 简历要点
见：[docs/RESUME_BULLETS.md](docs/RESUME_BULLETS.md)


