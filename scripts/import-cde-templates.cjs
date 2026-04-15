/**
 * C系列 - 检验批/施工记录模板导入脚本
 */

const sqlite3 = require('sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'database', 'heritagedoc.db');

const cTemplates = [
  {
    template_code: 'C.01', name: '钢筋安装检验批质量验收记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '钢筋安装工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '钢筋品种规格', type: 'text' }, { name: '钢筋数量', type: 'number' },
      { name: '受拉钢筋锚固长度', type: 'text' }, { name: '接头位置', type: 'text' },
      { name: '保护层厚度', type: 'text' }, { name: '绑扎质量', type: 'text' },
      { name: '施工自检结果', type: 'textarea' }, { name: '监理抽检结果', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、检验批验收部位\n二、钢筋安装质量控制要点\n三、施工自检情况\n四、监理抽检情况\n五、验收结论`
  },
  {
    template_code: 'C.02', name: '模板安装检验批质量验收记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '模板安装工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '模板类型', type: 'text' }, { name: '支撑系统', type: 'text' },
      { name: '标高允许偏差', type: 'text' }, { name: '截面尺寸允许偏差', type: 'text' },
      { name: '垂直度允许偏差', type: 'text' }, { name: '平整度允许偏差', type: 'text' },
      { name: '接缝质量', type: 'text' }, { name: '脱模剂涂刷', type: 'text' },
      { name: '施工自检', type: 'textarea' }, { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、检验批验收部位\n二、模板安装质量控制要点\n三、施工自检情况\n四、监理抽检情况\n五、验收结论`
  },
  {
    template_code: 'C.03', name: '混凝土施工记录表', doc_category: '检验批', doc_type: '施工记录',
    heritage_type: '古建筑', description: '混凝土浇筑施工记录',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '浇筑部位', type: 'text' }, { name: '浇筑日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '混凝土强度等级', type: 'text' }, { name: '混凝土配合比', type: 'text' },
      { name: '坍落度', type: 'text' }, { name: '浇筑量（m3）', type: 'number' },
      { name: '天气情况', type: 'text' }, { name: '环境温度', type: 'text' },
      { name: '开始时间', type: 'text' }, { name: '结束时间', type: 'text' },
      { name: '施工方法', type: 'textarea' }, { name: '振捣情况', type: 'textarea' },
      { name: '试块留置', type: 'textarea' }, { name: '养护条件', type: 'text' },
      { name: '异常情况处理', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' },
    ],
    content: `一、浇筑概况\n二、混凝土拌制情况\n三、浇筑施工情况\n四、试块留置情况\n五、养护情况\n六、异常情况及处理`
  },
  {
    template_code: 'C.04', name: '混凝土强度检测报告', doc_category: '检验批', doc_type: '检测报告',
    heritage_type: '古建筑', description: '混凝土抗压强度检测报告',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '报告编号', type: 'text' }, { name: '检测单位', type: 'text' },
      { name: '检测日期', type: 'date' }, { name: '报告日期', type: 'date' },
      { name: '混凝土强度等级', type: 'text' }, { name: '水泥品种', type: 'text' },
      { name: '粗骨料品种', type: 'text' }, { name: '配合比', type: 'text' },
      { name: '试块数量', type: 'number' }, { name: '龄期', type: 'text' },
      { name: '检测方法', type: 'text' }, { name: '设备编号', type: 'text' },
      { name: '检测数据', type: 'textarea' }, { name: '平均值', type: 'number' },
      { name: '最小值', type: 'number' }, { name: '标准差', type: 'number' },
      { name: '评定结果', type: 'text' }, { name: '结论', type: 'textarea' },
      { name: '检测人员签字', type: 'signature' }, { name: '审核人员签字', type: 'signature' },
      { name: '批准人员签字', type: 'signature' }, { name: '检测单位盖章', type: 'signature' },
    ],
    content: `一、检测概况\n二、检测依据\n三、检测方法\n四、检测数据\n五、结果评定\n六、检测结论\n附件：检测原始记录`
  },
  {
    template_code: 'C.05', name: '砌体工程检验批质量验收记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '砌体工程施工质量检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '砌体材料', type: 'text' }, { name: '砂浆强度等级', type: 'text' },
      { name: '灰缝厚度', type: 'text' }, { name: '灰缝饱满度', type: 'text' },
      { name: '墙面垂直度', type: 'text' }, { name: '表面平整度', type: 'text' },
      { name: '轴线位置', type: 'text' }, { name: '预埋件位置', type: 'text' },
      { name: '施工自检', type: 'textarea' }, { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、检验批验收概况\n二、砌体质量控制要点\n三、施工自检情况\n四、监理抽检情况\n五、验收结论`
  },
  {
    template_code: 'C.06', name: '木构件修缮检验批质量验收记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '木结构构件修缮工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '构件名称', type: 'text' }, { name: '构件材质', type: 'text' },
      { name: '病害情况', type: 'textarea' }, { name: '修缮方法', type: 'textarea' },
      { name: '加固措施', type: 'textarea' }, { name: '防腐处理', type: 'text' },
      { name: '外观质量', type: 'text' }, { name: '尺寸偏差', type: 'text' },
      { name: '施工自检', type: 'textarea' }, { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、构件概况\n二、病害调查情况\n三、修缮方法及工艺\n四、加固措施\n五、防腐处理\n六、质量检验\n七、验收结论`
  },
  {
    template_code: 'C.07', name: '屋面工程检验批质量验收记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '屋面防水保温工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '屋面做法', type: 'text' }, { name: '防水材料', type: 'text' },
      { name: '保温材料', type: 'text' }, { name: '防水层厚度', type: 'text' },
      { name: '保温层厚度', type: 'text' }, { name: '排水坡度', type: 'text' },
      { name: '细部处理', type: 'textarea' }, { name: '蓄水试验', type: 'text' },
      { name: '施工自检', type: 'textarea' }, { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、屋面工程概况\n二、防水保温材料\n三、细部构造处理\n四、蓄水试验情况\n五、验收结论`
  },
  {
    template_code: 'C.08', name: '抹灰工程检验批质量验收记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '抹灰工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '抹灰类型', type: 'text' }, { name: '砂浆配合比', type: 'text' },
      { name: '基层处理', type: 'textarea' }, { name: '分层厚度', type: 'text' },
      { name: '表面平整度', type: 'text' }, { name: '立面垂直度', type: 'text' },
      { name: '阴阳角方正', type: 'text' }, { name: '空鼓裂缝', type: 'text' },
      { name: '养护情况', type: 'text' }, { name: '施工自检', type: 'textarea' },
      { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、抹灰工程概况\n二、砂浆配制情况\n三、基层处理情况\n四、质量检验\n五、验收结论`
  },
  {
    template_code: 'C.09', name: '油漆彩绘工程检验批质量验收记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '古建筑油漆彩绘工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '涂料品种', type: 'text' }, { name: '色彩编号', type: 'text' },
      { name: '基层处理', type: 'textarea' }, { name: '底漆涂刷', type: 'text' },
      { name: '中涂施工', type: 'text' }, { name: '面漆涂刷', type: 'text' },
      { name: '色彩准确性', type: 'text' }, { name: '工艺规范', type: 'textarea' },
      { name: '观感质量', type: 'text' }, { name: '施工自检', type: 'textarea' },
      { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、油漆彩绘工程概况\n二、涂料配制\n三、施工工艺\n四、质量检验\n五、验收结论`
  },
  {
    template_code: 'C.10', name: '防水工程检验批质量验收记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '建筑防水工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '防水部位', type: 'text' }, { name: '防水材料', type: 'text' },
      { name: '施工方法', type: 'textarea' }, { name: '搭接宽度', type: 'text' },
      { name: '附加层设置', type: 'text' }, { name: '细部密封', type: 'text' },
      { name: '蓄水/淋水试验', type: 'textarea' }, { name: '试验时间', type: 'text' },
      { name: '试验结果', type: 'text' }, { name: '施工自检', type: 'textarea' },
      { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、防水工程概况\n二、防水材料及施工方法\n三、细部构造处理\n四、蓄水/淋水试验\n五、验收结论`
  },
  {
    template_code: 'C.11', name: '施工日志', doc_category: '检验批', doc_type: '施工记录',
    heritage_type: '古建筑', description: '分项工程施工日志',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '日期', type: 'date' }, { name: '天气', type: 'text' },
      { name: '气温', type: 'text' }, { name: '风力', type: 'text' },
      { name: '当日施工部位', type: 'textarea' }, { name: '当日施工内容', type: 'textarea' },
      { name: '投入人工', type: 'number' }, { name: '投入机械', type: 'textarea' },
      { name: '材料进场情况', type: 'textarea' }, { name: '质量问题', type: 'textarea' },
      { name: '安全文明施工', type: 'textarea' }, { name: '技术交底', type: 'textarea' },
      { name: '其他事项', type: 'textarea' }, { name: '值班人员', type: 'signature' },
      { name: '记录人', type: 'signature' }, { name: '施工员', type: 'signature' },
    ],
    content: `一、当日施工概况\n二、人员机械投入\n三、材料进场情况\n四、质量问题及处理\n五、安全文明施工\n六、其他事项`
  },
  {
    template_code: 'C.12', name: '隐蔽工程验收记录表', doc_category: '检验批', doc_type: '验收记录',
    heritage_type: '古建筑', description: '隐蔽工程覆盖前验收记录',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '设计单位', type: 'text' }, { name: '隐蔽内容', type: 'textarea' },
      { name: '施工做法', type: 'textarea' }, { name: '材料规格', type: 'textarea' },
      { name: '施工质量', type: 'textarea' }, { name: '质量保证资料', type: 'textarea' },
      { name: '存在问题及处理', type: 'textarea' },
      { name: '施工方验收意见', type: 'signature' }, { name: '监理方验收意见', type: 'signature' },
      { name: '设计方确认意见', type: 'signature' }, { name: '业主方确认意见', type: 'signature' },
    ],
    content: `一、隐蔽工程概况\n二、施工做法及材料规格\n三、质量保证资料\n四、存在问题及处理意见\n五、验收结论`
  },
  {
    template_code: 'C.13', name: '材料进场报审表', doc_category: '检验批', doc_type: '报审表',
    heritage_type: '古建筑', description: '工程材料构配件进场报审',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '报审日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '材料名称', type: 'text' }, { name: '规格型号', type: 'text' },
      { name: '数量', type: 'number' }, { name: '生产单位', type: 'text' },
      { name: '进场日期', type: 'date' }, { name: '用途部位', type: 'text' },
      { name: '质量证明文件', type: 'textarea' }, { name: '外观检查', type: 'textarea' },
      { name: '复试报告', type: 'textarea' }, { name: '自检结果', type: 'textarea' },
      { name: '施工方签字', type: 'signature' }, { name: '监理方审批意见', type: 'signature' },
    ],
    content: `致（监理单位）：

我方于    年   月   日进场的下列工程材料/构配件/设备，经自检外观质量合格，质量证明文件齐全，现报上，请予以审核。

附件：
1、质量证明文件
2、出厂合格证
3、复试报告（如需要）
4、自检记录`
  },
  {
    template_code: 'C.14', name: '沉降观测记录表', doc_category: '检验批', doc_type: '观测记录',
    heritage_type: '古建筑', description: '建筑物沉降观测记录',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '观测日期', type: 'date' },
      { name: '观测周期', type: 'text' }, { name: '天气', type: 'text' },
      { name: '观测点编号', type: 'text' }, { name: '上次标高', type: 'number' },
      { name: '本次标高', type: 'number' }, { name: '本次沉降量', type: 'number' },
      { name: '累计沉降量', type: 'number' }, { name: '观测精度', type: 'text' },
      { name: '水准点编号', type: 'text' }, { name: '仪器编号', type: 'text' },
      { name: '观测人员', type: 'signature' }, { name: '复核人员', type: 'signature' },
      { name: '备注', type: 'textarea' },
    ],
    content: `沉降观测记录\n工程名称：\n观测日期：\n观测依据：\n\n观测数据：（详见附表）\n\n观测结论：`
  },
  {
    template_code: 'C.15', name: '构件更换维修记录表', doc_category: '检验批', doc_type: '维修记录',
    heritage_type: '古建筑', description: '古建筑构件更换维修详细记录',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '构件编号', type: 'text' }, { name: '构件名称', type: 'text' },
      { name: '所处位置', type: 'text' }, { name: '记录日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '原有病害描述', type: 'textarea' }, { name: '病害成因分析', type: 'textarea' },
      { name: '更换/维修方案', type: 'textarea' }, { name: '使用材料', type: 'textarea' },
      { name: '更换构件来源', type: 'text' }, { name: '工艺做法', type: 'textarea' },
      { name: '更换前后照片', type: 'file' }, { name: '施工自检', type: 'textarea' },
      { name: '监理确认', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '业主确认', type: 'signature' },
    ],
    content: `一、构件概况\n二、病害调查与成因分析\n三、更换/维修方案\n四、施工工艺\n五、质量检查\n六、验收确认`
  },
  {
    template_code: 'C.16', name: '地基验槽记录表', doc_category: '检验批', doc_type: '验收记录',
    heritage_type: '古建筑', description: '地基（基槽）验收记录',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '勘察单位', type: 'text' }, { name: '设计单位', type: 'text' },
      { name: '基槽尺寸', type: 'text' }, { name: '基槽底标高', type: 'text' },
      { name: '土层土质', type: 'textarea' }, { name: '地下水位', type: 'text' },
      { name: '地基承载力', type: 'textarea' }, { name: '不良地质', type: 'textarea' },
      { name: '处理意见', type: 'textarea' },
      { name: '施工方确认', type: 'signature' }, { name: '勘察方确认', type: 'signature' },
      { name: '设计方确认', type: 'signature' }, { name: '监理方确认', type: 'signature' },
    ],
    content: `一、工程概况\n二、基槽开挖情况\n三、地基土层土质情况\n四、地下水位情况\n五、地基承载力检测\n六、不良地质处理\n七、各方确认意见`
  },
  {
    template_code: 'C.17', name: '结构实体检测报告', doc_category: '检验批', doc_type: '检测报告',
    heritage_type: '古建筑', description: '混凝土结构实体检测报告',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '报告编号', type: 'text' }, { name: '检测单位', type: 'text' },
      { name: '检测日期', type: 'date' }, { name: '报告日期', type: 'date' },
      { name: '检测项目', type: 'textarea' }, { name: '检测数量', type: 'number' },
      { name: '检测方法', type: 'text' }, { name: '检测设备', type: 'text' },
      { name: '检测依据', type: 'textarea' }, { name: '检测数据', type: 'textarea' },
      { name: '数据分析', type: 'textarea' }, { name: '评定结论', type: 'textarea' },
      { name: '检测人员签字', type: 'signature' }, { name: '审核人员签字', type: 'signature' },
      { name: '批准人员签字', type: 'signature' }, { name: '检测单位盖章', type: 'signature' },
    ],
    content: `一、检测概况\n二、检测依据\n三、检测方法\n四、检测数据\n五、数据分析\n六、评定结论\n附件：检测原始记录及照片`
  },
  {
    template_code: 'C.18', name: '电气安装检验批质量验收记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '建筑电气安装工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '安装内容', type: 'textarea' }, { name: '导线规格型号', type: 'text' },
      { name: '管线敷设', type: 'textarea' }, { name: '接地情况', type: 'text' },
      { name: '绝缘电阻测试', type: 'text' }, { name: '接地电阻测试', type: 'text' },
      { name: '照明通电试运行', type: 'text' }, { name: '施工自检', type: 'textarea' },
      { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '电工班长签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、电气安装概况\n二、管线敷设情况\n三、接地装置情况\n四、绝缘电阻测试\n五、照明通电试运行\n六、验收结论`
  },
  {
    template_code: 'C.19', name: '给排水安装检验批质量验收记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '给排水及采暖安装工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '安装内容', type: 'textarea' }, { name: '管材规格', type: 'text' },
      { name: '管道试压', type: 'text' }, { name: '管道冲洗消毒', type: 'text' },
      { name: '阀门安装', type: 'text' }, { name: '卫生器具安装', type: 'text' },
      { name: '通水试验', type: 'text' }, { name: '施工自检', type: 'textarea' },
      { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '管道班长签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、给排水安装概况\n二、管道试压情况\n三、管道冲洗消毒\n四、通水试验\n五、验收结论`
  },
  {
    template_code: 'C.20', name: '通风与空调安装检验批记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '通风与空调安装工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '安装内容', type: 'textarea' }, { name: '风管制作', type: 'textarea' },
      { name: '风管安装', type: 'textarea' }, { name: '设备安装', type: 'textarea' },
      { name: '风管漏风测试', type: 'text' }, { name: '系统调试', type: 'textarea' },
      { name: '施工自检', type: 'textarea' }, { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '班长签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、通风空调安装概况\n二、风管制作安装\n三、设备安装\n四、风管漏风测试\n五、系统调试\n六、验收结论`
  },
  {
    template_code: 'C.21', name: '节能工程检验批质量验收记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '建筑节能工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '节能设计标准', type: 'textarea' }, { name: '保温材料', type: 'text' },
      { name: '保温层厚度', type: 'text' }, { name: '保温材料检测', type: 'textarea' },
      { name: '门窗节能', type: 'textarea' }, { name: '采暖节能', type: 'textarea' },
      { name: '电气节能', type: 'textarea' },
      { name: '施工自检', type: 'textarea' }, { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、节能工程概况\n二、墙体保温\n三、门窗节能\n四、采暖节能\n五、电气节能\n六、验收结论`
  },
  {
    template_code: 'C.22', name: '石材/砖砌体加固检验批记录表', doc_category: '检验批', doc_type: '检验批',
    heritage_type: '古建筑', description: '石砌体/砖砌体加固修缮工程检验批',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '原结构材质', type: 'text' }, { name: '加固方法', type: 'textarea' },
      { name: '加固材料', type: 'textarea' }, { name: '锚固/灌浆质量', type: 'textarea' },
      { name: '新增构件连接', type: 'textarea' }, { name: '表面处理', type: 'text' },
      { name: '强度检测', type: 'textarea' }, { name: '施工自检', type: 'textarea' },
      { name: '监理抽检', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '质检员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、原结构概况\n二、加固方案及方法\n三、加固材料\n四、施工质量控制\n五、强度检测\n六、验收结论`
  },
];

// ============ D系列 安全管理 ============
const dTemplates = [
  {
    template_code: 'D.01', name: '施工安全管理制度', doc_category: '安全管理', doc_type: '管理制度',
    heritage_type: '古建筑', description: '施工安全管理制度文件',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '编制单位', type: 'text' }, { name: '编制日期', type: 'date' },
      { name: '适用范围', type: 'textarea' }, { name: '安全管理目标', type: 'textarea' },
      { name: '安全管理组织机构', type: 'textarea' }, { name: '安全生产责任制', type: 'textarea' },
      { name: '安全技术措施', type: 'textarea' }, { name: '安全检查制度', type: 'textarea' },
      { name: '安全事故应急预案', type: 'textarea' }, { name: '编制人', type: 'signature' },
      { name: '审核人', type: 'signature' }, { name: '批准人', type: 'signature' },
    ],
    content: `一、总则\n二、安全管理目标\n三、安全管理组织机构\n四、安全生产责任制\n五、安全技术措施\n六、安全检查制度\n七、安全教育培训\n八、安全事故应急预案\n九、附则`
  },
  {
    template_code: 'D.02', name: '施工安全风险评估表', doc_category: '安全管理', doc_type: '风险评估',
    heritage_type: '古建筑', description: '施工安全风险辨识与评估',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '评估日期', type: 'date' }, { name: '评估单位', type: 'text' },
      { name: '风险辨识', type: 'textarea' }, { name: '风险等级', type: 'text' },
      { name: '可能后果', type: 'textarea' }, { name: '预防措施', type: 'textarea' },
      { name: '应急措施', type: 'textarea' }, { name: '责任人', type: 'text' },
      { name: '评估人', type: 'signature' }, { name: '审核人', type: 'signature' },
    ],
    content: `一、工程概况及评估范围\n二、风险辨识\n三、风险等级划分标准\n四、风险等级及后果\n五、预防措施\n六、应急措施\n七、责任人`
  },
  {
    template_code: 'D.03', name: '文物保护安全施工方案', doc_category: '安全管理', doc_type: '施工方案',
    heritage_type: '古建筑', description: '文物保护专项安全施工方案',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '编制单位', type: 'text' }, { name: '编制日期', type: 'date' },
      { name: '文物概况', type: 'textarea' }, { name: '安全风险分析', type: 'textarea' },
      { name: '文物保护措施', type: 'textarea' }, { name: '施工安全措施', type: 'textarea' },
      { name: '监测方案', type: 'textarea' }, { name: '应急预案', type: 'textarea' },
      { name: '编制人', type: 'signature' }, { name: '审核人', type: 'signature' },
      { name: '批准人', type: 'signature' }, { name: '文物部门意见', type: 'signature' },
    ],
    content: `一、工程概况及文物保护对象\n二、安全风险分析\n三、文物保护措施\n四、施工安全技术措施\n五、变形监测方案\n六、应急预案\n七、审批意见`
  },
  {
    template_code: 'D.04', name: '特种作业人员登记表', doc_category: '安全管理', doc_type: '登记表',
    heritage_type: '古建筑', description: '特种作业人员资格审查登记',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '登记日期', type: 'date' },
      { name: '姓名', type: 'text' }, { name: '性别', type: 'text' }, { name: '年龄', type: 'number' },
      { name: '工种', type: 'text' }, { name: '证书编号', type: 'text' }, { name: '证书有效期', type: 'date' },
      { name: '发证机关', type: 'text' }, { name: '进场日期', type: 'date' },
      { name: '退场日期', type: 'date' }, { name: '用人单位', type: 'text' },
      { name: '资格审查意见', type: 'textarea' }, { name: '登记人', type: 'signature' },
      { name: '安全员确认', type: 'signature' }, { name: '备注', type: 'textarea' },
    ],
    content: `特种作业人员资格审查登记\n（电工作业/焊接与热切割/高处作业/制冷与空调等）`
  },
  {
    template_code: 'D.05', name: '安全检查记录表', doc_category: '安全管理', doc_type: '检查记录',
    heritage_type: '古建筑', description: '日常安全检查记录',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '检查日期', type: 'date' }, { name: '检查类型', type: 'text' },
      { name: '检查人员', type: 'text' }, { name: '天气', type: 'text' },
      { name: '检查范围', type: 'textarea' }, { name: '检查内容', type: 'textarea' },
      { name: '发现问题', type: 'textarea' }, { name: '隐患等级', type: 'text' },
      { name: '整改要求', type: 'textarea' }, { name: '整改责任人', type: 'text' },
      { name: '整改期限', type: 'date' }, { name: '复查情况', type: 'textarea' },
      { name: '检查人签字', type: 'signature' }, { name: '安全员签字', type: 'signature' },
      { name: '项目经理签字', type: 'signature' },
    ],
    content: `一、检查概况\n二、检查范围及内容\n三、发现的问题及隐患\n四、整改要求\n五、复查情况`
  },
  {
    template_code: 'D.06', name: '动火作业审批表', doc_category: '安全管理', doc_type: '审批表',
    heritage_type: '古建筑', description: '动火作业许可证',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '申请日期', type: 'date' },
      { name: '动火部位', type: 'text' }, { name: '动火类型', type: 'text' },
      { name: '动火人员', type: 'text' }, { name: '证书编号', type: 'text' },
      { name: '动火时间开始', type: 'date' }, { name: '动火时间结束', type: 'date' },
      { name: '作业环境分析', type: 'textarea' }, { name: '防火措施', type: 'textarea' },
      { name: '灭火器材', type: 'text' }, { name: '监护人员', type: 'text' },
      { name: '申请单位意见', type: 'signature' }, { name: '安全部门审批', type: 'signature' },
      { name: '监理工程师审批', type: 'signature' }, { name: '完工确认', type: 'signature' },
    ],
    content: `动火作业许可证\n\n申请单位：\n动火等级：\n动火时间：\n动火人员：\n监护人员：\n\n安全措施：\n\n审批意见：\n\n完工确认：`
  },
  {
    template_code: 'D.07', name: '高空作业安全审批表', doc_category: '安全管理', doc_type: '审批表',
    heritage_type: '古建筑', description: '高空作业许可证',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '申请日期', type: 'date' },
      { name: '作业部位', type: 'text' }, { name: '作业高度', type: 'text' },
      { name: '作业人员', type: 'text' }, { name: '安全带配置', type: 'text' },
      { name: '安全网设置', type: 'text' }, { name: '脚手架情况', type: 'textarea' },
      { name: '防护措施', type: 'textarea' }, { name: '安全监护', type: 'text' },
      { name: '应急救援', type: 'textarea' },
      { name: '班组长意见', type: 'signature' }, { name: '安全员审批', type: 'signature' },
      { name: '项目经理审批', type: 'signature' }, { name: '监理确认', type: 'signature' },
    ],
    content: `高空作业许可证\n\n申请单位：\n作业高度：\n作业人员：\n\n安全措施：\n\n审批意见：`
  },
  {
    template_code: 'D.08', name: '临时用电申请表', doc_category: '安全管理', doc_type: '申请表',
    heritage_type: '古建筑', description: '施工现场临时用电申请',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '申请日期', type: 'date' },
      { name: '用电位置', type: 'text' }, { name: '用电设备清单', type: 'textarea' },
      { name: '总功率', type: 'number' }, { name: '配电箱位置', type: 'text' },
      { name: '导线规格', type: 'text' }, { name: '接地保护', type: 'textarea' },
      { name: '漏电保护', type: 'textarea' }, { name: '用电管理制度', type: 'textarea' },
      { name: '申请单位', type: 'signature' }, { name: '安全员审批', type: 'signature' },
      { name: '监理工程师确认', type: 'signature' },
    ],
    content: `临时用电申请表\n\n申请单位：\n用电位置：\n用电设备：\n总功率：\n\n配电方案：\n安全措施：\n\n审批意见：`
  },
  {
    template_code: 'D.09', name: '基坑支护变形监测记录表', doc_category: '安全管理', doc_type: '监测记录',
    heritage_type: '古建筑', description: '基坑支护结构变形监测记录',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '监测日期', type: 'date' },
      { name: '监测点编号', type: 'text' }, { name: '上次累计位移', type: 'number' },
      { name: '本次位移', type: 'number' }, { name: '本次累计位移', type: 'number' },
      { name: '位移速率', type: 'number' }, { name: '位移预警值', type: 'number' },
      { name: '是否预警', type: 'text' }, { name: '地下水位', type: 'number' },
      { name: '地表沉降', type: 'number' }, { name: '周边环境', type: 'textarea' },
      { name: '监测人员', type: 'signature' }, { name: '审核人员', type: 'signature' },
    ],
    content: `基坑监测记录\n工程名称：\n监测日期：\n\n监测数据：（详见附表）\n\n监测结论及预警情况：`
  },
  {
    template_code: 'D.10', name: '安全事故报告表', doc_category: '安全管理', doc_type: '报告表',
    heritage_type: '古建筑', description: '安全事故报告',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '事故日期', type: 'date' }, { name: '事故时间', type: 'text' },
      { name: '事故地点', type: 'text' }, { name: '事故类型', type: 'text' },
      { name: '事故等级', type: 'text' }, { name: '伤亡情况', type: 'textarea' },
      { name: '事故经过', type: 'textarea' }, { name: '事故原因', type: 'textarea' },
      { name: '直接经济损失', type: 'number' }, { name: '已采取措施', type: 'textarea' },
      { name: '事故经过人', type: 'signature' }, { name: '项目经理', type: 'signature' },
      { name: '公司负责人', type: 'signature' }, { name: '报告日期', type: 'date' },
    ],
    content: `一、事故基本情况\n二、事故经过\n三、人员伤亡及财产损失\n四、事故原因分析\n五、已采取的措施\n六、进一步处理方案\n七、事故报告单位及人员`
  },
  {
    template_code: 'D.11', name: '文明施工检查记录表', doc_category: '安全管理', doc_type: '检查记录',
    heritage_type: '古建筑', description: '文明施工日常检查',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '检查日期', type: 'date' }, { name: '检查人员', type: 'text' },
      { name: '施工围挡', type: 'text' }, { name: '场地整洁', type: 'text' },
      { name: '材料堆放', type: 'text' }, { name: '人员着装', type: 'text' },
      { name: '警示标志', type: 'text' }, { name: '灭火器材', type: 'text' },
      { name: '噪声控制', type: 'text' }, { name: '扬尘控制', type: 'text' },
      { name: '污水处理', type: 'text' }, { name: '生活设施', type: 'text' },
      { name: '问题及整改', type: 'textarea' }, { name: '检查人签字', type: 'signature' },
      { name: '安全员签字', type: 'signature' }, { name: '项目经理签字', type: 'signature' },
    ],
    content: `一、文明施工检查概况\n二、现场情况\n三、存在问题\n四、整改要求\n五、复查情况`
  },
  {
    template_code: 'D.12', name: '脚手架工程检验批安全验收记录表', doc_category: '安全管理', doc_type: '检验批',
    heritage_type: '古建筑', description: '脚手架工程安全验收记录',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '搭设部位', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '施工单位', type: 'text' }, { name: '监理单位', type: 'text' },
      { name: '脚手架类型', type: 'text' }, { name: '搭设高度', type: 'text' },
      { name: '基础处理', type: 'textarea' }, { name: '立杆间距', type: 'text' },
      { name: '水平杆间距', type: 'text' }, { name: '连墙件设置', type: 'text' },
      { name: '剪刀撑设置', type: 'text' }, { name: '扫地杆设置', type: 'text' },
      { name: '防护设施', type: 'text' }, { name: '荷载试验', type: 'text' },
      { name: '施工自检', type: 'textarea' }, { name: '监理验收', type: 'textarea' },
      { name: '施工员签字', type: 'signature' }, { name: '安全员签字', type: 'signature' },
      { name: '监理工程师签字', type: 'signature' }, { name: '验收结论', type: 'text' },
    ],
    content: `一、脚手架工程概况\n二、搭设质量\n三、连墙件设置\n四、防护设施\n五、荷载试验\n六、验收结论`
  },
];

// ============ E系列 竣工归档 ============
const eTemplates = [
  {
    template_code: 'E.01', name: '竣工报告', doc_category: '竣工归档', doc_type: '竣工报告',
    heritage_type: '古建筑', description: '文物保护工程竣工报告',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '项目编号', type: 'text' }, { name: '报告日期', type: 'date' },
      { name: '建设单位', type: 'text' }, { name: '施工单位', type: 'text' },
      { name: '监理单位', type: 'text' }, { name: '设计单位', type: 'text' },
      { name: '勘察单位', type: 'text' }, { name: '实际工期', type: 'textarea' },
      { name: '工程实际造价', type: 'number' }, { name: '工程完成内容', type: 'textarea' },
      { name: '工程质量评价', type: 'textarea' }, { name: '主要工程量', type: 'textarea' },
      { name: '文物保护效果', type: 'textarea' }, { name: '存在问题及处理', type: 'textarea' },
      { name: '档案资料情况', type: 'textarea' },
      { name: '建设单位负责人', type: 'signature' }, { name: '施工单位负责人', type: 'signature' },
      { name: '监理单位负责人', type: 'signature' }, { name: '设计单位负责人', type: 'signature' },
    ],
    content: `一、工程概况\n二、工程实际工期\n三、工程实际造价\n四、工程完成内容\n五、工程质量评价\n六、主要工程量\n七、文物保护效果\n八、存在问题及处理意见\n九、档案资料情况\n十、各方验收意见`
  },
  {
    template_code: 'E.02', name: '竣工验收证书', doc_category: '竣工归档', doc_type: '验收证书',
    heritage_type: '古建筑', description: '文物保护工程竣工验收证书',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '项目编号', type: 'text' },
      { name: '验收日期', type: 'date' }, { name: '验收地点', type: 'text' },
      { name: '验收组织单位', type: 'text' }, { name: '验收主持单位', type: 'text' },
      { name: '验收参加单位', type: 'textarea' }, { name: '验收依据', type: 'textarea' },
      { name: '验收范围和内容', type: 'textarea' }, { name: '验收结论', type: 'textarea' },
      { name: '遗留问题及处理意见', type: 'textarea' },
      { name: '建设单位（章）', type: 'signature' }, { name: '施工单位（章）', type: 'signature' },
      { name: '监理单位（章）', type: 'signature' }, { name: '设计单位（章）', type: 'signature' },
      { name: '勘察单位（章）', type: 'signature' }, { name: '验收专家组', type: 'signature' },
    ],
    content: `文物保护工程竣工验收证书

编号：

工程名称：
验收日期：

一、验收组织单位\n二、验收依据\n三、验收范围和内容\n四、验收结论\n五、遗留问题及处理意见

（各方盖章）`
  },
  {
    template_code: 'E.03', name: '工程结算审核定案表', doc_category: '竣工归档', doc_type: '结算表',
    heritage_type: '古建筑', description: '工程结算审核定案',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '项目编号', type: 'text' }, { name: '施工单位', type: 'text' },
      { name: '报送金额', type: 'number' }, { name: '审核金额', type: 'number' },
      { name: '审减金额', type: 'number' }, { name: '定案金额', type: 'number' },
      { name: '审核依据', type: 'textarea' }, { name: '审核说明', type: 'textarea' },
      { name: '审核机构', type: 'text' }, { name: '审核人员', type: 'text' },
      { name: '编制人', type: 'signature' }, { name: '审核人', type: 'signature' },
      { name: '审定人', type: 'signature' },
      { name: '建设单位确认', type: 'signature' }, { name: '施工单位确认', type: 'signature' },
    ],
    content: `工程结算审核定案表\n\n一、工程概况\n二、结算报送金额\n三、审核情况\n四、审核结论\n五、各方确认意见`
  },
  {
    template_code: 'E.04', name: '工程财务决算表', doc_category: '竣工归档', doc_type: '决算表',
    heritage_type: '古建筑', description: '工程财务决算',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '项目编号', type: 'text' },
      { name: '财务决算金额', type: 'number' }, { name: '资金来源', type: 'textarea' },
      { name: '建筑安装工程费', type: 'number' }, { name: '设备购置费', type: 'number' },
      { name: '其他费用', type: 'number' }, { name: '预备费', type: 'number' },
      { name: '资金使用情况', type: 'textarea' }, { name: '编制依据', type: 'textarea' },
      { name: '编制说明', type: 'textarea' }, { name: '编制单位', type: 'signature' },
      { name: '审核单位', type: 'signature' }, { name: '批准单位', type: 'signature' },
    ],
    content: `工程财务决算\n\n一、工程概况\n二、决算金额\n三、资金来源及使用\n四、决算编制说明\n五、各方确认意见`
  },
  {
    template_code: 'E.05', name: '工程保修书', doc_category: '竣工归档', doc_type: '保修书',
    heritage_type: '古建筑', description: '工程保修责任书',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '项目编号', type: 'text' },
      { name: '建设单位', type: 'text' }, { name: '施工单位', type: 'text' },
      { name: '保修范围', type: 'textarea' }, { name: '保修期限', type: 'text' },
      { name: '保修责任', type: 'textarea' }, { name: '保修程序', type: 'textarea' },
      { name: '联系方式', type: 'textarea' }, { name: '其他约定', type: 'textarea' },
      { name: '建设单位（章）', type: 'signature' }, { name: '施工单位（章）', type: 'signature' },
    ],
    content: `工程保修书\n\n一、工程概况\n二、保修范围\n三、保修期限\n四、保修责任\n五、保修程序\n六、其他约定\n\n（双方盖章）`
  },
  {
    template_code: 'E.06', name: '工程使用说明书', doc_category: '竣工归档', doc_type: '说明书',
    heritage_type: '古建筑', description: '文物保护工程使用说明书',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '建设单位', type: 'text' },
      { name: '设计单位', type: 'text' }, { name: '施工单位', type: 'text' },
      { name: '工程概况', type: 'textarea' }, { name: '结构形式', type: 'textarea' },
      { name: '使用功能', type: 'textarea' }, { name: '使用注意事项', type: 'textarea' },
      { name: '维护保养要求', type: 'textarea' }, { name: '常见故障处理', type: 'textarea' },
      { name: '编制单位', type: 'signature' }, { name: '审核人', type: 'signature' },
    ],
    content: `一、工程概况\n二、建筑结构形式\n三、主要使用功能\n四、使用注意事项\n五、维护保养要求\n六、常见故障及处理\n七、联系方式`
  },
  {
    template_code: 'E.07', name: '监理工作总结报告', doc_category: '竣工归档', doc_type: '报告',
    heritage_type: '古建筑', description: '工程监理工作总结',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '监理单位', type: 'text' }, { name: '总监理工程师', type: 'text' },
      { name: '监理工作概况', type: 'textarea' }, { name: '监理组织机构', type: 'textarea' },
      { name: '质量控制', type: 'textarea' }, { name: '进度控制', type: 'textarea' },
      { name: '投资控制', type: 'textarea' }, { name: '合同管理', type: 'textarea' },
      { name: '安全监理', type: 'textarea' }, { name: '文物保护监理', type: 'textarea' },
      { name: '协调工作', type: 'textarea' }, { name: '监理工作评价', type: 'textarea' },
      { name: '经验与教训', type: 'textarea' },
      { name: '总监理工程师', type: 'signature' }, { name: '监理单位（章）', type: 'signature' },
    ],
    content: `监理工作总结报告\n\n一、工程概况\n二、监理组织机构\n三、监理工作概况\n四、质量控制\n五、进度控制\n六、投资控制\n七、合同管理\n八、安全监理\n九、文物保护监理\n十、协调工作\n十一、监理工作评价\n十二、主要经验与教训`
  },
  {
    template_code: 'E.08', name: '工程声像档案', doc_category: '竣工归档', doc_type: '声像档案',
    heritage_type: '古建筑', description: '工程声像资料归档',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '声像资料类型', type: 'text' },
      { name: '拍摄时间', type: 'date' }, { name: '拍摄地点', type: 'text' },
      { name: '拍摄内容', type: 'textarea' }, { name: '拍摄人员', type: 'text' },
      { name: '文件格式', type: 'text' }, { name: '文件大小', type: 'text' },
      { name: '文件数量', type: 'number' }, { name: '存放位置', type: 'text' },
      { name: '说明备注', type: 'textarea' }, { name: '归档人', type: 'signature' },
      { name: '审核人', type: 'signature' }, { name: '接收人', type: 'signature' },
    ],
    content: `工程声像档案\n\n一、档案概况\n二、拍摄内容说明\n三、保管条件\n四、移交情况`
  },
  {
    template_code: 'E.09', name: '竣工图纸目录', doc_category: '竣工归档', doc_type: '图纸目录',
    heritage_type: '古建筑', description: '竣工图纸归档目录',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '图纸名称', type: 'text' },
      { name: '图纸编号', type: 'text' }, { name: '图幅', type: 'text' },
      { name: '数量', type: 'number' }, { name: '绘制单位', type: 'text' },
      { name: '绘制日期', type: 'date' }, { name: '是否电子版', type: 'text' },
      { name: '电子版格式', type: 'text' }, { name: '说明', type: 'textarea' },
      { name: '归档人', type: 'signature' }, { name: '审核人', type: 'signature' },
    ],
    content: `竣工图纸归档目录\n\n（详见附表）\n\n编制人：\n审核人：\n归档日期：`
  },
  {
    template_code: 'E.10', name: '竣工验收组意见汇总表', doc_category: '竣工归档', doc_type: '意见汇总',
    heritage_type: '古建筑', description: '竣工验收专家组意见汇总',
    fields: [
      { name: '工程名称', type: 'text' }, { name: '验收日期', type: 'date' },
      { name: '专家姓名', type: 'text' }, { name: '专家单位', type: 'text' },
      { name: '专家职称', type: 'text' }, { name: '专业领域', type: 'text' },
      { name: '验收意见', type: 'textarea' }, { name: '建议和要求', type: 'textarea' },
      { name: '总体评价', type: 'textarea' }, { name: '结论', type: 'text' },
      { name: '专家签字', type: 'signature' }, { name: '日期', type: 'date' },
    ],
    content: `竣工验收专家意见\n\n一、基本情况\n二、各专家意见\n三、建议和要求\n四、总体评价\n五、结论`
  },
];

async function runImport(label, templates) {
  const db = new sqlite3.Database(dbPath);

  let success = 0, skip = 0, fail = 0;

  for (const t of templates) {
    const id = `template-${t.template_code}`;
    const schema = JSON.stringify({ fields: t.fields });
    const content = t.content || '';

    try {
      const exists = await new Promise(res => {
        db.get('SELECT id FROM templates WHERE id = ?', [id], (e, r) => res(r));
      });
      if (exists) { skip++; continue; }

      await new Promise((res, rej) => {
        db.run(
          `INSERT INTO templates (id, template_code, name, heritage_type, doc_category, doc_type, description, table_schema, default_content, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
          [id, t.template_code, t.name, t.heritage_type, t.doc_category, t.doc_type, t.description, schema, content],
          function(e) { if (e) rej(e); else res(); }
        );
      });
      console.log(`  [OK] ${t.template_code} ${t.name}`);
      success++;
    } catch (e) {
      console.log(`  [FAIL] ${t.template_code}: ${e.message}`);
      fail++;
    }
  }

  db.close();
  console.log(`[${label}] 成功:${success} 跳过:${skip} 失败:${fail}`);
  return { success, skip, fail };
}

async function main() {
  console.log('=== C系列 检验批/施工记录 ===');
  await runImport('C系列', cTemplates);

  console.log('\n=== D系列 安全管理 ===');
  await runImport('D系列', dTemplates);

  console.log('\n=== E系列 竣工归档 ===');
  await runImport('E系列', eTemplates);

  console.log('\n全部完成!');
}

main().catch(console.error);
