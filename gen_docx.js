const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType,
  ShadingType, VerticalAlign, LevelFormat,
} = require("docx");

const FONT = "微软雅黑";
const CONTENT_WIDTH = 9026; // A4 1" margins
const TABLE_WIDTH = 9026;

// ---------- 工具函数 ----------
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text, bold: true, size: 30, font: FONT, color: "1F4E79" })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, font: FONT, color: "2E74B5" })],
  });
}
function body(text, opts = {}) {
  const { indent = false, bold = false } = opts;
  return new Paragraph({
    spacing: { after: 120, line: 320 },
    indent: indent ? { firstLine: 480 } : undefined,
    children: [new TextRun({ text, size: 24, font: FONT, bold })],
  });
}
function script(text) {
  // 口语化讲稿正文
  return new Paragraph({
    spacing: { after: 160, line: 360 },
    indent: { firstLine: 480 },
    children: [new TextRun({ text, size: 24, font: FONT })],
  });
}
function tip(text) {
  // 舞台提示
  return new Paragraph({
    spacing: { after: 120, line: 320 },
    children: [new TextRun({ text: "【演示动作】" + text, italics: true, size: 22, font: FONT, color: "808080" })],
  });
}
function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80, line: 320 },
    children: [new TextRun({ text, size: 24, font: FONT, bold })],
  });
}

// ---------- 表格 ----------
const border = { style: BorderStyle.SINGLE, size: 1, color: "BBBBBB" };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, w, { header = false, bold = false } = {}) {
  return new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: header ? { fill: "1F4E79", type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 20, font: FONT, bold: header || bold, color: header ? "FFFFFF" : "000000" })],
      }),
    ],
  });
}

function makeTable(colWidths, rowsData, headerRow = 0) {
  const rows = rowsData.map((r, ri) =>
    new TableRow({
      children: r.map((c, ci) => cell(c, colWidths[ci], { header: ri === headerRow })),
    })
  );
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows,
  });
}

// ---------- 文档内容 ----------
const children = [];

// ===== 封面 =====
children.push(new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "世界杯/苏超赛事信息与互动预测平台", bold: true, size: 44, font: FONT, color: "1F4E79" })] }));
children.push(new Paragraph({ spacing: { after: 400 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "课程设计 演示讲稿（口语版）", size: 32, font: FONT, color: "2E74B5" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "完整照着念的讲稿  · 含演示动作提示与答辩备答", size: 22, font: FONT, color: "808080" })] }));
children.push(new Paragraph({ pageBreakBefore: true, children: [] }));

// ===== 使用说明 =====
children.push(h1("使用说明"));
children.push(body("本讲稿按“照着念”的风格编写，配合你的网页演示逐步进行。带【演示动作】的段落是舞台提示，不需要念出来，按提示操作网页即可。建议正式答辩前完整走一遍，把时间和语速调整到合适。"));
children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "账号准备：管理员 ", size: 22, font: FONT }), new TextRun({ text: "admin / admin123", bold: true, size: 22, font: FONT }), new TextRun({ text: "；普通用户（如 小射手 / 123456）", size: 22, font: FONT })] }));
children.push(new Paragraph({ pageBreakBefore: true, children: [] }));

// ===== 第一页：开场白 =====
children.push(h1("一、开场白（约1分钟）"));
children.push(script("各位老师好，我今天的课程设计项目是一个基于 Web 的《世界杯/苏超赛事信息与互动预测平台》。简单来说，它既能看球赛的赛程和比分，又能让用户注册登录、对比赛结果进行预测，还有赛后讨论区和个人积分，是一个功能比较完整的小型全栈应用。下面我先介绍一下系统是怎么设计的，再给大家做现场演示。"));
tip("打开首页，展示赛事列表页面。");

// ===== 第二页：技术栈与总体架构 =====
children.push(h1("二、技术栈与总体架构（约2分钟）"));
script("先讲技术选型。前端我用的 Vue 3 加 Vite 脚手架，配合 Vue Router 做页面路由、Pinia 做状态管理；后端是 Node.js 加 Express，提供 RESTful 风格的接口；数据存储用 MySQL 关系型数据库；最后整个项目用 Docker Compose 一键编排部署。");
script("从架构上看，前端负责展示和交互，也就是用户看到和点击的部分；后端负责业务逻辑和计算，比如登录校验、比分预测、积分结算；数据库负责持久化存储。三者各司其职，通过 HTTP 接口连接。整个项目分成了三个大的目录：backend 是后端代码，frontend 是前端代码，db 里是数据库初始化脚本。");
children.push(makeTable([2260, 2253, 2253, 2260], [
  ["层", "技术", "职责", "对应目录"],
  ["前端", "Vue 3 + Vite", "页面展示与交互", "frontend/"],
  ["后端", "Node.js + Express", "业务逻辑与接口", "backend/"],
  ["数据库", "MySQL", "数据存储", "db/init.sql"],
  ["部署", "Docker Compose", "一键编排启动", "docker-compose.yml"],
], 0));
children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));

// ===== 第三页：五大功能模块 =====
children.push(h1("三、五大功能模块（约3分钟）"));
script("接下来讲功能。整个系统分五个模块，我逐个说。");
children.push(h2("1. 赛事信息展示"));
script("第一块是赛事信息。首页会列出所有比赛，包括主客队、比赛时间、实时比分和状态。这里要特别说明一个设计：比赛状态分未开赛、进行中和已结束三种，它不是存在数据库里的固定字段，而是根据“当前时间”和比赛开赛时间动态算出来的。这样数据永远是对的，也方便后台推进时间来演示整个比赛生命周期。");
children.push(h2("2. 用户注册登录"));
script("第二块是用户系统。用户能注册、登录，后端用 JWT 令牌做身份校验，密码也是加密存储的。管理员有单独权限，可以管理时间线。");
children.push(h2("3. 比分预测"));
script("第三块是预测。未开赛的比赛，用户可以在赛前提交预测比分。这里有个防剧透的设计：没开赛的比赛，接口返回的比分是 null，也就是不提前泄露结果，保证公平。");
children.push(h2("4. 赛后讨论区"));
script("第四块是讨论区。比赛结束会自动生成一篇主帖，球迷可以围绕这场比赛留言讨论。");
children.push(h2("5. 个人中心"));
script("第五块是个人中心，能看到我的预测记录和累计积分。积分是系统核心激励：猜中精确比分得 3 分，只猜对胜平负方向得 1 分，猜错不得分。");
children.push(new Paragraph({ pageBreakBefore: true, children: [] }));

// ===== 第四页：核心亮点-虚拟时间与自动结算 =====
children.push(h1("四、核心亮点：虚拟时间系统与自动结算（约3分钟）"));
script("下面讲我这次作业里最核心、也最有亮点的一块——虚拟时间系统。");
script("它的设计思路是：数据库里有一张设置表，存了一个虚拟当前时间，叫 virtual_time。系统里所有跟时间相关的判断，比如比赛有没有开赛、算不算结束、积分该不该结算，都拿这个虚拟时间去比对，而不是用服务器真实时间。");
script("这么做的好处很明显：第一，演示的时候可以脱离真实时间，随时把时间往前推，立刻看到比赛从未开赛到结束的完整过程，非常适合课堂演示；第二，逻辑清晰，状态全部由时间动态推导，不引入额外的状态字段。");
script("配合这个机制，我实现了自动结算。当我用管理员接口推进时间时，后端会扫描所有已经结束、但还没有结算的比赛，自动计算每个用户这场的得分并累加到积分里，同时自动生成该场比赛的讨论主帖和两条评论，用的几个球迷账号轮换来发。整个结算过程是幂等的——也就是说，同一场比赛即使被推进好几次时间，也只会结算一次，不会重复加分、重复发帖。");
children.push(h2("积分规则速览"));
children.push(makeTable([4513, 4513], [
  ["预测结果", "得分"],
  ["猜中精确比分", "+3 分"],
  ["只猜对胜平负方向", "+1 分"],
  ["猜错", "+0 分"],
], 0));
children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
tip("切到后台，演示管理员推进时间，展示积分自动变化和讨论区自动生成帖子。");

// ===== 第五页：数据库设计 =====
children.push(h1("五、数据库设计（约2分钟）"));
script("数据库一共六张表。settings 存虚拟时间和系统配置；users 存用户账号和积分；matches 存比赛，主客队、开赛时间和最终比分；predictions 存用户的预测，并加了唯一约束，保证同一场比赛一个用户只能预测一次；posts 和 comments 分别是讨论区的主帖和评论。");
script("种子数据我预置了 30 场比赛、15 个账号、一批预测记录和讨论帖子，让系统一跑起来就有数据可以看，不用手动一条条填。");
children.push(makeTable([2260, 2253, 2253, 2260], [
  ["表名", "作用", "关键字段", "备注"],
  ["settings", "系统设置", "virtual_time", "虚拟时间核心"],
  ["users", "用户账号", "username, points", "积分存储"],
  ["matches", "比赛信息", "home, away, start_time", "比分预置防剧透"],
  ["predictions", "用户预测", "user_id, match_id", "唯一约束"],
  ["posts", "讨论主帖", "match_id", "赛后自动生成"],
  ["comments", "评论", "post_id", "球迷发言"],
], 0));
children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));

// ===== 第六页：部署与运行 =====
children.push(h1("六、部署与运行（约1.5分钟）"));
script("部署方面，我用 Docker Compose 把数据库、后端、前端三个服务编排到一起，一个 docker compose up -d --build 命令就能把整个系统跑起来。前端构建好之后由 Nginx 提供服务，同时 Nginx 做反向代理，把 /api 开头的请求转发给后端，解决跨域问题，也方便统一入口。");
script("整个工程的结构很清晰：后端按资源分文件管理接口，比如登录、比赛、预测、帖子、个人中心、后台，各有各的路由文件，可维护性比较好。前端每个页面一个视图文件，组件化开发。");
children.push(new Paragraph({ pageBreakBefore: true, children: [] }));

// ===== 第七页：现场演示流程 =====
children.push(h1("七、现场演示流程（照着操作，约4-5分钟）"));
children.push(h2("第1步：展示首页与赛事列表"));
script("现在进入演示。当前是首页，展示的是赛事列表。大家可以看到每场比赛的主客队、时间、比分和状态。有未开赛、进行中和已结束几种状态，我用虚拟时间控制，可以随时切换。");
children.push(h2("第2步：登录用户并预测"));
script("我先用普通用户账号登录，账号是“小射手”。登录后，我找一场还没开赛的比赛，点进去提交一个预测比分。这里能看到，未开赛的比赛比分是隐藏的，保证不会提前剧透结果。");
tip("演示：登录 -> 找到未开赛比赛 -> 提交预测。");
children.push(h2("第3步：管理员推进时间"));
script("接下来切到管理员账号，进入时间控制台。我把虚拟时间往前提，让它越过几场比赛的结束时间。大家注意观察：积分会自动变化，该结算的比赛都结算了，同时每场刚结束的比赛，讨论区会自动生成主帖和评论。");
tip("演示：切管理员 -> 推进时间 -> 展示积分变化和自动生成的帖子。");
children.push(h2("第4步：查看个人中心"));
script("回到我的个人中心，可以看到我的预测记录，以及刚才这场比赛的预测得了多少分，积分已经累加上去了。");
children.push(h2("第5步：讨论区互动"));
script("最后去讨论区，看一下比赛结束后自动生成的帖子，可以在里面留言互动。这就是整个系统的完整闭环。");
children.push(new Paragraph({ pageBreakBefore: true, children: [] }));

// ===== 第八页：答辩备答 =====
children.push(h1("八、答辩常见问题备答"));
children.push(h2("Q1：为什么不用真实时间，要做虚拟时间？"));
body("因为课程演示需要在有限时间里展示“开赛-结束-结算”的完整生命周期，真实时间一天等不到一场比赛。虚拟时间让我可以自由推进，同时它证明了状态设计是纯由时间推导的，逻辑更干净。");
children.push(h2("Q2：怎么保证积分不会重复结算？"));
body("matches 表里有一个 settled 字段，结算过就置为已结算。每次推进时间结算时，只处理已结束但未结算的比赛，并且由这个字段保证幂等，重复推进也不会重复加分或重复发帖。");
children.push(h2("Q3：未开赛的比分是怎么隐藏的？"));
body("比赛结果虽然在数据库里有，但后端在返回给前端的接口里，对未开赛的比赛把比分字段置成 null，前端就不会显示，从而避免剧透、保证预测公平。");
children.push(h2("Q4：前后端怎么通信？有哪些接口？"));
body("走 HTTP + JSON，RESTful 风格。有登录注册、比赛列表、提交预测、讨论区、个人中心、管理员推进时间等接口，具体都写在 docs/api.md 文档里。");
children.push(h2("Q5：密码安全吗？JWT 是干什么的？");
body("密码在数据库里不是明文，是加密存储的。用户登录成功后，后端签发一个 JWT 令牌，前端后续请求带上它，后端中间件校验通过才能访问需要登录的接口，管理员接口还需要管理员权限。");
children.push(h2("Q6：数据从哪来？"));
body("db/init.sql 里预置了 30 场比赛、15 个账号、一批预测和讨论数据，初始化数据库时一次性导入，方便演示，不用手工造数据。");
children.push(h2("Q7：和真实业务网站比，还能怎么改进？"));
body("目前是单机课程项目。如果要上线，可以加更细的权限、用 Redis 做缓存、加消息队列异步处理大并发下的积分结算、前端做更完善的懒加载和错误处理等。");

// ---------- 生成文档 ----------
const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: "1F4E79" },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: "2E74B5" },
        paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children,
  }],
});

const outPath = path.join("C:", "Users", "lenovo", "Desktop", "演示讲稿.docx");
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("SAVED:" + outPath);
  console.log("SIZE:" + buf.length);
});
