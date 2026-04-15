/**
 * 前期申报资料模板导入脚本
 * B系列 - 前期申报阶段
 */

const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// 数据库路径
const dbPath = path.join(__dirname, '..', 'database', 'heritagedoc.db');

// 前期申报资料模板
const earlyStageTemplates = [
  {
    template_code: 'B.1',
    name: '文物保护工程立项申请表',
    heritage_type: '古建筑',
    doc_category: '前期申报',
    doc_type: '申请表',
    description: '文物保护工程立项申请用表',
    table_schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '项目编号', type: 'text', required: true },
        { name: '文物名称', type: 'text', required: true },
        { name: '文物级别', type: 'text', required: true },
        { name: '地理位置', type: 'text', required: true },
        { name: '产权单位', type: 'text', required: true },
        { name: '使用单位', type: 'text', required: true },
        { name: '立项依据', type: 'textarea', required: true },
        { name: '工程性质', type: 'text', required: true },
        { name: '工程范围', type: 'textarea', required: true },
        { name: '工程规模', type: 'textarea', required: true },
        { name: '工程投资估算', type: 'number', required: true },
        { name: '资金来源', type: 'text', required: true },
        { name: '计划工期', type: 'text', required: true },
        { name: '申请单位', type: 'text', required: true },
        { name: '联系人', type: 'text', required: true },
        { name: '联系电话', type: 'text', required: true },
        { name: '申请日期', type: 'date', required: true },
        { name: '附件清单', type: 'textarea', required: false },
        { name: '申请单位盖章', type: 'signature', required: true },
        { name: '主管部门意见', type: 'signature', required: true },
        { name: '审批部门意见', type: 'signature', required: true },
      ]
    }),
    default_content: `申请单位（盖章）：

根据《中华人民共和国文物保护法》及相关法规，我单位拟对以下文物保护工程申请立项：

一、工程概况
1. 工程名称：
2. 文物名称及级别：
3. 地理位置：
4. 产权单位：

二、立项依据
（说明立项的政策依据、文物保护需求等）

三、工程性质与范围
（说明工程属于修缮、加固、迁移、重建等性质，具体范围）

四、工程投资估算及资金来源
估算总投资：    万元
资金来源：

五、计划工期
计划开工日期：    年    月    日
计划竣工日期：    年    月    日

附件：
1、文物现状勘察报告
2、工程可行性研究报告
3、文物影响评估报告
4、相关图纸资料
5、其他支撑材料`
  },
  {
    template_code: 'B.2',
    name: '文物现状勘察报告',
    heritage_type: '古建筑',
    doc_category: '前期申报',
    doc_type: '报告',
    description: '文物现状勘察成果报告',
    table_schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '文物名称', type: 'text', required: true },
        { name: '勘察单位', type: 'text', required: true },
        { name: '勘察日期', type: 'date', required: true },
        { name: '勘察人员', type: 'text', required: true },
        { name: '文物地址', type: 'text', required: true },
        { name: '建造年代', type: 'text', required: true },
        { name: '文物价值评估', type: 'textarea', required: true },
        { name: '保存现状描述', type: 'textarea', required: true },
        { name: '主要病害类型', type: 'textarea', required: true },
        { name: '病害分布范围', type: 'textarea', required: true },
        { name: '病害成因分析', type: 'textarea', required: true },
        { name: '结构安全评估', type: 'textarea', required: true },
        { name: '环境影响因素', type: 'textarea', required: false },
        { name: '勘察结论', type: 'textarea', required: true },
        { name: '保护建议', type: 'textarea', required: true },
        { name: '项目负责人签字', type: 'signature', required: true },
        { name: '勘察单位盖章', type: 'signature', required: true },
        { name: '报告日期', type: 'date', required: true },
      ]
    }),
    default_content: `一、勘察概况
1. 勘察目的
2. 勘察依据
3. 勘察范围
4. 勘察方法

二、文物概况
1. 历史沿革
2. 建筑布局
3. 结构形式
4. 主要材料
5. 装饰装修

三、保存现状
1. 整体保存状况
2. 主要病害调查
   - 结构病害
   - 构件病害
   - 装饰病害
   - 环境因素

四、病害分析
1. 病害类型统计
2. 病害成因分析
3. 发展趋势预测

五、价值评估
1. 历史价值
2. 艺术价值
3. 科学价值

六、勘察结论与建议
1. 主要结论
2. 保护建议
3. 工程必要性分析

附件：
1、现状照片
2、测绘图纸
3、检测报告
4、其他资料`
  },
  {
    template_code: 'B.3',
    name: '文物保护工程方案设计报审表',
    heritage_type: '古建筑',
    doc_category: '前期申报',
    doc_type: '报审表',
    description: '工程方案设计报审用表',
    table_schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '项目编号', type: 'text', required: true },
        { name: '设计单位', type: 'text', required: true },
        { name: '设计资质等级', type: 'text', required: true },
        { name: '项目负责人', type: 'text', required: true },
        { name: '设计阶段', type: 'text', required: true },
        { name: '设计范围', type: 'textarea', required: true },
        { name: '设计依据', type: 'textarea', required: true },
        { name: '设计原则', type: 'textarea', required: true },
        { name: '工程技术措施', type: 'textarea', required: true },
        { name: '主要材料做法', type: 'textarea', required: true },
        { name: '工程概算', type: 'number', required: true },
        { name: '设计周期', type: 'text', required: true },
        { name: '设计单位意见', type: 'signature', required: true },
        { name: '建设单位意见', type: 'signature', required: true },
        { name: '专家审查意见', type: 'signature', required: true },
        { name: '主管部门审批意见', type: 'signature', required: true },
      ]
    }),
    default_content: `致：（主管部门）

我单位已完成    工程方案设计，现报请审查批准。

一、设计概况
1. 设计范围及内容
2. 设计依据
3. 设计原则

二、工程措施
1. 结构加固措施
2. 构件修缮措施
3. 装饰修复措施
4. 环境整治措施

三、技术经济指标
1. 工程概算：    万元
2. 主要工程量
3. 材料用量

四、设计周期
方案设计阶段：    日历天

附件：
1、设计说明书
2、设计图纸
3、工程概算书
4、效果图
5、其他技术文件`
  },
  {
    template_code: 'B.4',
    name: '工程概算书',
    heritage_type: '古建筑',
    doc_category: '前期申报',
    doc_type: '概算书',
    description: '文物保护工程投资概算',
    table_schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编制单位', type: 'text', required: true },
        { name: '编制日期', type: 'date', required: true },
        { name: '编制依据', type: 'textarea', required: true },
        { name: '工程费用合计', type: 'number', required: true },
        { name: '工程建设其他费', type: 'number', required: true },
        { name: '预备费', type: 'number', required: true },
        { name: '工程总投资', type: 'number', required: true },
        { name: '资金来源', type: 'text', required: true },
        { name: '编制人', type: 'text', required: true },
        { name: '审核人', type: 'text', required: true },
        { name: '审定人', type: 'text', required: true },
        { name: '编制单位盖章', type: 'signature', required: true },
      ]
    }),
    default_content: `一、编制说明
1. 编制依据
2. 编制范围
3. 费用构成
4. 取费标准

二、工程概算汇总表
（详见附表）

三、费用构成
1. 工程费用
   - 建筑工程费
   - 安装工程费
   - 设备购置费

2. 工程建设其他费
   - 建设单位管理费
   - 勘察设计费
   - 监理费
   - 招标代理费
   - 其他费用

3. 预备费
   - 基本预备费
   - 涨价预备费

四、资金筹措
1. 中央财政资金
2. 地方财政资金
3. 自筹资金
4. 其他资金

五、编制单位资质
（盖章）

编制人：        审核人：        审定人：
日期：          日期：          日期：`
  },
  {
    template_code: 'B.5',
    name: '文物影响评估报告',
    heritage_type: '古建筑',
    doc_category: '前期申报',
    doc_type: '报告',
    description: '建设工程对文物影响评估',
    table_schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '评估对象', type: 'text', required: true },
        { name: '评估单位', type: 'text', required: true },
        { name: '评估日期', type: 'date', required: true },
        { name: '建设活动描述', type: 'textarea', required: true },
        { name: '文物概况', type: 'textarea', required: true },
        { name: '建设活动与文物关系', type: 'textarea', required: true },
        { name: '振动影响分析', type: 'textarea', required: false },
        { name: '地基沉降影响', type: 'textarea', required: false },
        { name: '景观环境影响', type: 'textarea', required: true },
        { name: '施工安全影响', type: 'textarea', required: true },
        { name: '使用功能影响', type: 'textarea', required: false },
        { name: '影响程度评估', type: 'text', required: true },
        { name: '保护措施建议', type: 'textarea', required: true },
        { name: '监测方案建议', type: 'textarea', required: true },
        { name: '评估结论', type: 'textarea', required: true },
        { name: '评估人员签字', type: 'signature', required: true },
        { name: '评估单位盖章', type: 'signature', required: true },
      ]
    }),
    default_content: `一、评估概况
1. 评估目的
2. 评估依据
3. 评估范围
4. 评估方法

二、建设活动概况
1. 建设项目基本情况
2. 建设活动位置
3. 建设活动规模
4. 施工工艺及流程

三、文物概况
1. 文物基本信息
2. 文物价值
3. 保存现状
4. 保护范围

四、影响分析
1. 振动影响
2. 地基沉降影响
3. 景观环境影响
4. 施工安全影响
5. 其他影响

五、影响程度评估
（轻微/一般/较大/重大）

六、保护措施建议
1. 工程避让措施
2. 防护工程措施
3. 监测措施
4. 应急预案

七、评估结论

附件：
1、位置关系图
2、影响分析图
3、监测布点图
4、相关计算书`
  },
  {
    template_code: 'B.6',
    name: '考古勘探报告',
    heritage_type: '古建筑',
    doc_category: '前期申报',
    doc_type: '报告',
    description: '工程涉及区域考古勘探成果',
    table_schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '勘探区域', type: 'text', required: true },
        { name: '勘探面积', type: 'number', required: true },
        { name: '勘探单位', type: 'text', required: true },
        { name: '勘探资质', type: 'text', required: true },
        { name: '项目负责人', type: 'text', required: true },
        { name: '勘探时间', type: 'text', required: true },
        { name: '勘探方法', type: 'textarea', required: true },
        { name: '地层堆积情况', type: 'textarea', required: true },
        { name: '遗迹遗物情况', type: 'textarea', required: true },
        { name: '重要发现', type: 'textarea', required: false },
        { name: '文物价值评估', type: 'textarea', required: true },
        { name: '工程影响评估', type: 'textarea', required: true },
        { name: '保护建议', type: 'textarea', required: true },
        { name: '勘探结论', type: 'textarea', required: true },
        { name: '项目负责人签字', type: 'signature', required: true },
        { name: '勘探单位盖章', type: 'signature', required: true },
        { name: '报告日期', type: 'date', required: true },
      ]
    }),
    default_content: `一、勘探概况
1. 工作背景
2. 工作依据
3. 工作范围
4. 工作目标

二、勘探区域概况
1. 地理位置
2. 历史沿革
3. 既往考古工作

三、勘探工作
1. 工作方法
2. 工作过程
3. 勘探布孔

四、勘探成果
1. 地层堆积
2. 遗迹现象
3. 出土遗物

五、重要发现
（如有）

六、价值评估
1. 文物价值
2. 科学价值

七、工程影响评估
1. 影响分析
2. 风险评估

八、保护建议
1. 原址保护建议
2. 发掘建议
3. 工程调整建议

九、结论

附件：
1、勘探位置图
2、勘探布孔图
3、遗迹分布图
4、典型剖面图
5、出土遗物照片
6、其他资料`
  },
  {
    template_code: 'B.7',
    name: '工程地质勘察报告',
    heritage_type: '古建筑',
    doc_category: '前期申报',
    doc_type: '报告',
    description: '工程地质条件勘察成果',
    table_schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '勘察范围', type: 'text', required: true },
        { name: '勘察单位', type: 'text', required: true },
        { name: '勘察资质', type: 'text', required: true },
        { name: '项目负责人', type: 'text', required: true },
        { name: '勘察日期', type: 'date', required: true },
        { name: '勘察阶段', type: 'text', required: true },
        { name: '地形地貌', type: 'textarea', required: true },
        { name: '地层结构', type: 'textarea', required: true },
        { name: '岩土性质', type: 'textarea', required: true },
        { name: '地下水情况', type: 'textarea', required: true },
        { name: '不良地质作用', type: 'textarea', required: false },
        { name: '地震效应评价', type: 'textarea', required: true },
        { name: '地基评价', type: 'textarea', required: true },
        { name: '基础方案建议', type: 'textarea', required: true },
        { name: '施工注意事项', type: 'textarea', required: true },
        { name: '项目负责人签字', type: 'signature', required: true },
        { name: '勘察单位盖章', type: 'signature', required: true },
        { name: '报告日期', type: 'date', required: true },
      ]
    }),
    default_content: `一、勘察概况
1. 勘察目的
2. 勘察依据
3. 勘察范围及工作量
4. 勘察方法

二、场地工程地质条件
1. 地形地貌
2. 地层结构
3. 岩土性质
4. 地下水
5. 不良地质作用

三、岩土参数分析
1. 物理力学指标
2. 原位测试成果
3. 室内试验成果

四、场地评价
1. 场地稳定性评价
2. 地基均匀性评价
3. 地震效应评价
4. 水土腐蚀性评价

五、地基基础方案
1. 地基评价
2. 基础类型建议
3. 地基处理建议
4. 基坑支护建议

六、结论与建议
1. 主要结论
2. 设计建议
3. 施工建议
4. 监测建议

附件：
1、勘探点平面布置图
2、工程地质剖面图
3、钻孔柱状图
4、试验成果图表
5、其他资料`
  },
  {
    template_code: 'B.8',
    name: '文物本体测绘图',
    heritage_type: '古建筑',
    doc_category: '前期申报',
    doc_type: '测绘图',
    description: '文物建筑测绘成果',
    table_schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '文物名称', type: 'text', required: true },
        { name: '测绘单位', type: 'text', required: true },
        { name: '测绘资质', type: 'text', required: true },
        { name: '项目负责人', type: 'text', required: true },
        { name: '测绘日期', type: 'date', required: true },
        { name: '测绘范围', type: 'textarea', required: true },
        { name: '测绘方法', type: 'textarea', required: true },
        { name: '测绘精度', type: 'text', required: true },
        { name: '总平面图', type: 'file', required: true },
        { name: '各层平面图', type: 'file', required: true },
        { name: '立面图', type: 'file', required: true },
        { name: '剖面图', type: 'file', required: true },
        { name: '大样详图', type: 'file', required: false },
        { name: '测绘说明', type: 'textarea', required: true },
        { name: '项目负责人签字', type: 'signature', required: true },
        { name: '测绘单位盖章', type: 'signature', required: true },
        { name: '提交日期', type: 'date', required: true },
      ]
    }),
    default_content: `一、测绘概况
1. 测绘目的
2. 测绘依据
3. 测绘范围
4. 测绘方法
5. 测绘精度

二、文物概况
1. 文物基本信息
2. 建筑形制
3. 结构特点
4. 装饰装修

三、测绘成果
1. 总平面图
2. 各层平面图
3. 立面图
4. 剖面图
5. 大样详图
6. 三维模型（如有）

四、测绘说明
1. 坐标系统
2. 高程系统
3. 测绘精度说明
4. 特殊情况说明

五、质量检查
1. 自检情况
2. 互检情况
3. 验收情况

附件：
1、测绘图纸
2、测绘数据
3、照片资料
4、其他成果`
  },
  {
    template_code: 'B.9',
    name: '历史沿革调查报告',
    heritage_type: '古建筑',
    doc_category: '前期申报',
    doc_type: '报告',
    description: '文物历史沿革调查研究',
    table_schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '文物名称', type: 'text', required: true },
        { name: '调查单位', type: 'text', required: true },
        { name: '调查人员', type: 'text', required: true },
        { name: '调查日期', type: 'date', required: true },
        { name: '创建年代考证', type: 'textarea', required: true },
        { name: '历史变迁', type: 'textarea', required: true },
        { name: '历代修缮记录', type: 'textarea', required: true },
        { name: '重要历史事件', type: 'textarea', required: false },
        { name: '相关历史人物', type: 'textarea', required: false },
        { name: '历史功能用途', type: 'textarea', required: true },
        { name: '档案文献资料', type: 'textarea', required: true },
        { name: '口述历史资料', type: 'textarea', required: false },
        { name: '调查结论', type: 'textarea', required: true },
        { name: '调查人员签字', type: 'signature', required: true },
        { name: '调查单位盖章', type: 'signature', required: true },
        { name: '报告日期', type: 'date', required: true },
      ]
    }),
    default_content: `一、调查概况
1. 调查目的
2. 调查依据
3. 调查范围
4. 调查方法

二、文物概况
1. 文物名称
2. 地理位置
3. 保护级别
4. 产权归属

三、历史沿革
1. 创建年代考证
2. 历史变迁
3. 历代修缮
4. 重要历史事件
5. 相关历史人物

四、历史价值
1. 历史价值
2. 艺术价值
3. 科学价值
4. 社会价值

五、档案文献
1. 历史档案
2. 文献记载
3. 碑刻题记
4. 口述历史

六、调查结论

附件：
1、历史照片
2、文献复印件
3、碑刻拓片
4、访谈记录
5、其他资料`
  },
  {
    template_code: 'B.10',
    name: '工程可行性研究报告',
    heritage_type: '古建筑',
    doc_category: '前期申报',
    doc_type: '报告',
    description: '文物保护工程可行性研究',
    table_schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '项目编号', type: 'text', required: true },
        { name: '编制单位', type: 'text', required: true },
        { name: '编制日期', type: 'date', required: true },
        { name: '项目背景', type: 'textarea', required: true },
        { name: '建设必要性', type: 'textarea', required: true },
        { name: '建设可行性', type: 'textarea', required: true },
        { name: '工程方案比选', type: 'textarea', required: true },
        { name: '推荐方案', type: 'textarea', required: true },
        { name: '投资估算', type: 'number', required: true },
        { name: '资金筹措方案', type: 'textarea', required: true },
        { name: '实施计划', type: 'textarea', required: true },
        { name: '效益分析', type: 'textarea', required: true },
        { name: '风险分析', type: 'textarea', required: true },
        { name: '研究结论', type: 'textarea', required: true },
        { name: '编制人签字', type: 'signature', required: true },
        { name: '审核人签字', type: 'signature', required: true },
        { name: '编制单位盖章', type: 'signature', required: true },
      ]
    }),
    default_content: `一、项目概况
1. 项目名称
2. 建设单位
3. 建设地点
4. 建设规模

二、项目背景
1. 政策背景
2. 文物保护需求
3. 项目由来

三、建设必要性
1. 文物保护需要
2. 展示利用需要
3. 安全管理需要

四、建设可行性
1. 技术可行性
2. 经济可行性
3. 实施可行性

五、工程方案
1. 方案比选
2. 推荐方案
3. 技术措施

六、投资估算与资金筹措
1. 投资估算
2. 资金来源
3. 使用计划

七、实施计划
1. 建设工期
2. 进度安排
3. 组织保障

八、效益分析
1. 社会效益
2. 经济效益
3. 环境效益

九、风险分析
1. 技术风险
2. 资金风险
3. 管理风险
4. 应对措施

十、结论与建议

附件：
1、相关批复文件
2、勘察报告
3、其他支撑材料`
  },
];

// 导入函数
async function importTemplates() {
  const db = new sqlite3.Database(dbPath);
  
  console.log('开始导入前期申报资料模板...');
  console.log(`数据库路径: ${dbPath}`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const template of earlyStageTemplates) {
    const id = `template-${template.template_code}`;
    
    try {
      // 检查是否已存在
      const exists = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM templates WHERE id = ?', [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (exists) {
        console.log(`  [跳过] ${template.template_code} - ${template.name} (已存在)`);
        skipCount++;
        continue;
      }
      
      // 插入新模板
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO templates (id, template_code, name, heritage_type, doc_category, doc_type, description, table_schema, default_content, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [id, template.template_code, template.name, template.heritage_type, template.doc_category, template.doc_type, template.description, template.table_schema, template.default_content],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      
      console.log(`  [成功] ${template.template_code} - ${template.name}`);
      successCount++;
    } catch (err) {
      console.error(`  [失败] ${template.template_code} - ${template.name}:`, err.message);
      errorCount++;
    }
  }
  
  db.close();
  
  console.log('\n导入完成:');
  console.log(`  成功: ${successCount}`);
  console.log(`  跳过: ${skipCount}`);
  console.log(`  失败: ${errorCount}`);
  console.log(`  总计: ${earlyStageTemplates.length}`);
}

// 执行导入
importTemplates().catch(console.error);
