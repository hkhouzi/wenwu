/**
 * 模板管理路由
 */

const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

// 获取模板列表
router.get('/', (req, res) => {
  try {
    const { doc_category, heritage_type, doc_type } = req.query;
    let sql = 'SELECT * FROM templates WHERE 1=1';
    const params = [];

    if (doc_category) {
      sql += ' AND doc_category = ?';
      params.push(doc_category);
    }

    if (heritage_type) {
      sql += ' AND (heritage_type = ? OR heritage_type IS NULL OR heritage_type = "")';
      params.push(heritage_type);
    }

    if (doc_type) {
      sql += ' AND doc_type = ?';
      params.push(doc_type);
    }

    sql += ' ORDER BY template_code, name';

    const templates = db.prepare(sql).all(...params);

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取单个模板
router.get('/:id', (req, res) => {
  try {
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);

    if (!template) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建模板
router.post('/', (req, res) => {
  try {
    const {
      template_code, name, heritage_type, doc_category, doc_type,
      description, table_schema, default_content
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '模板名称不能为空' });
    }

    const stmt = db.prepare(`
      INSERT INTO templates (template_code, name, heritage_type, doc_category, doc_type, description, table_schema, default_content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(template_code, name, heritage_type, doc_category, doc_type, description, table_schema, default_content);

    res.status(201).json({
      success: true,
      message: '模板创建成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, message: '模板编号已存在' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新模板
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      template_code, name, heritage_type, doc_category, doc_type,
      description, table_schema, default_content
    } = req.body;

    const existing = db.prepare('SELECT id FROM templates WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }

    db.prepare(`
      UPDATE templates SET
        template_code = COALESCE(?, template_code),
        name = COALESCE(?, name),
        heritage_type = ?,
        doc_category = ?,
        doc_type = ?,
        description = ?,
        table_schema = ?,
        default_content = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(template_code, name, heritage_type || null, doc_category || null, doc_type || null,
      description || null, table_schema || null, default_content || null, id);

    res.json({ success: true, message: '模板更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除模板
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 批量导入模板（文物保护工程标准表格）
router.post('/init', (req, res) => {
  try {
    const systemTemplates = [
      {
        template_code: 'A.1', name: '工程开工报审表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '报审表',
        description: '施工单位申请开工的报审文件',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '申请内容', type: 'textarea', required: true },
          { name: '附件清单', type: 'textarea' },
          { name: '施工单位意见', type: 'signature' },
          { name: '项目经理签字', type: 'signature' },
          { name: '监理工程师意见', type: 'signature' },
          { name: '总监理工程师意见', type: 'signature' },
        ]}),
        default_content: '致：（监理单位）\n我方承担的 工程，已完成了施工前各项准备工作，具备了开工条件，特此申请施工，请核查并签发开工指令。\n\n附件：\n1、开工报告\n2、证明文件\n3、准备阶段资料',
      },
      {
        template_code: 'A.2', name: '工程开工报告表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '报告表',
        description: '工程正式开工的书面报告',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '勘察设计单位', type: 'text' },
          { name: '类型', type: 'text' },
          { name: '业主单位开户行及帐号', type: 'text' },
          { name: '工程预算值', type: 'number' },
          { name: '施工单位执照号码', type: 'text' },
          { name: '施工单位资质等级', type: 'text' },
          { name: '项目经理签字', type: 'signature' },
          { name: '技术负责人签字', type: 'signature' },
          { name: '总监理工程师签字', type: 'signature' },
        ]}),
        default_content: '本表一式三份，业主单位、监理单位、施工单位各一份',
      },
      {
        template_code: 'A.3', name: '施工组织设计（方案）报审表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '报审表',
        description: '施工组织设计或施工方案报监理审批',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '方案内容简述', type: 'textarea', required: true },
          { name: '附录', type: 'file' },
          { name: '施工单位签字', type: 'signature' },
          { name: '监理工程师签字', type: 'signature' },
          { name: '总监理工程师签字', type: 'signature' },
        ]}),
        default_content: '致：（监理单位）\n我方已根据施工合同的有关规定完成了 工程施工组织设计（方案）的编制，并经我单位技术负责人审查批准，请予以审查。\n\n附录：施工组织设计（方案）',
      },
      {
        template_code: 'A.4', name: '分包单位资格报审表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '报审表',
        description: '分包单位资质及能力审查报批',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '分包单位名称', type: 'text', required: true },
          { name: '分包工程名称', type: 'text' },
          { name: '拟分包工程合同额', type: 'number' },
          { name: '分包占全部工程比例', type: 'text' },
          { name: '分包单位资质资料', type: 'file' },
          { name: '分包单位业绩', type: 'file' },
          { name: '施工单位签字', type: 'signature' },
          { name: '监理工程师审查意见', type: 'signature' },
          { name: '总监理工程师审查意见', type: 'signature' },
        ]}),
        default_content: '经考察，我方认为拟选择的（分包单位），具有承担下列分包工程的施工资质和施工技术能力，可以保证本工程按合同的规定进行施工。分包后，我方仍承担施工的全部责任。请予以批准。\n\n附件：\n1、分包单位资质资料\n2、分包单位业绩',
      },
      {
        template_code: 'A.5', name: '隐蔽工程现场检查申请表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '申请表',
        description: '隐蔽工程覆盖前的检查申请',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '分部分项工程名称', type: 'text', required: true },
          { name: '勘察设计单位', type: 'text' },
          { name: '检查内容及简图', type: 'textarea' },
          { name: '施工单位技术负责人签字', type: 'signature' },
          { name: '监理工程师签字', type: 'signature' },
          { name: '业主单位工地负责人签字', type: 'signature' },
        ]}),
        default_content: '用于隐蔽工程现场检查申请',
      },
      {
        template_code: 'A.6', name: '分部/分项工程报验申请表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '申请表',
        description: '分部或分项工程完成后的验收申请',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '分部分项工程名称', type: 'text', required: true },
          { name: '附件清单', type: 'textarea' },
          { name: '施工单位签字', type: 'signature' },
          { name: '总监理工程师签字', type: 'signature' },
        ]}),
        default_content: '致：（监理单位）\n我方已完成了 分部/分项工程施工，现报上该分部/分项工程报验申请表，请予以审查和验收。\n\n附件：\n1、现场检查记录\n2、质量保证资料\n\n注：本表仅为审查具备验收条件的工程表格，合格工程另有总监理工程师签发工程质量认可表格',
      },
      {
        template_code: 'A.7', name: '工程材料/构配件/设备报审表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '报审表',
        description: '进场材料构配件设备的报审',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '进场日期', type: 'date', required: true },
          { name: '材料构配件设备清单', type: 'textarea', required: true },
          { name: '拟用部位', type: 'text' },
          { name: '数量清单', type: 'file' },
          { name: '质量证明文件', type: 'file' },
          { name: '自检结果', type: 'file' },
          { name: '施工单位签字', type: 'signature' },
          { name: '监理审查意见', type: 'signature' },
        ]}),
        default_content: '致：（监理单位）\n我方于 年 月 日进场的工程材料/构配件/设备数量登记如下（见附表）。现将质量证明文件及自检结果报上，拟用于下列部位：\n请予以审核。\n\n附件：\n1、数量清单\n2、质量证明文件\n3、自检结果\n\n经检查上述内容，符合/不符合设计文件和规范要求，准许/不准许进场，同意/不同意使用于拟定部位。',
      },
      {
        template_code: 'A.8', name: '古建筑拆卸构件登记一览表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '登记表',
        description: '古建筑拆卸构件的详细登记与处理记录',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '构件清单', type: 'textarea', required: true },
          { name: '初步处理意见', type: 'textarea' },
          { name: '业主单位检查结果', type: 'signature' },
          { name: '监理工程师复查意见', type: 'signature' },
          { name: '施工单位自检结果', type: 'signature' },
        ]}),
        default_content: '用于记录古建筑拆卸构件的详细信息',
      },
      {
        template_code: 'A.9', name: '工程款支付申请表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '申请表',
        description: '工程进度款支付申请',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '完成工作内容', type: 'textarea', required: true },
          { name: '应支付日期', type: 'date', required: true },
          { name: '支付金额大写', type: 'text', required: true },
          { name: '支付金额小写', type: 'number', required: true },
          { name: '工程量清单', type: 'file' },
          { name: '计算方法', type: 'file' },
          { name: '施工单位签字', type: 'signature' },
        ]}),
        default_content: '致：（监理单位）\n我方已完成了 工作，按施工合同的规定，业主应在 年 月 日前支付该项工程款共（大写）（小写），现报上 工程付款申请表，请予以审查，并开具工程款支付证书。\n\n附件：\n1.工程量清单\n2.计算方法',
      },
      {
        template_code: 'A.10', name: '监理工程师通知回复单', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '回复单',
        description: '施工单位回复监理工程师通知的文件',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '通知编号', type: 'text', required: true },
          { name: '完成工作内容', type: 'textarea', required: true },
          { name: '详细内容', type: 'textarea' },
          { name: '施工单位签字', type: 'signature' },
          { name: '总监理工程师签字', type: 'signature' },
        ]}),
        default_content: '致：（监理单位）\n我方接到编号为 的监理工程师通知后，已按要求完成了 工作，现报上，请予以复查。',
      },
      {
        template_code: 'A.11', name: '工程复工申请表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '申请表',
        description: '暂停施工后的复工申请',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '停工令编号', type: 'text', required: true },
          { name: '整改工作内容', type: 'textarea', required: true },
          { name: '具体整改内容', type: 'textarea' },
          { name: '施工单位签字', type: 'signature' },
          { name: '总监理工程师签字', type: 'signature' },
        ]}),
        default_content: '致：（监理单位）\n我方接收到编号为 的工程暂时停工令后，已按要求完成了 整改工作，现报上，请现场予以检查验收。',
      },
      {
        template_code: 'A.12', name: '工程竣工报验单', heritage_type: '古建筑', doc_category: '竣工验收', doc_type: '报验单',
        description: '工程竣工后的验收申请',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '竣工内容', type: 'textarea', required: true },
          { name: '质量保证资料', type: 'file' },
          { name: '隐蔽工程验收资料', type: 'file' },
          { name: '分部分项工程验收资料', type: 'file' },
          { name: '构件编号图', type: 'file' },
          { name: '构件登记一览表', type: 'file' },
          { name: '构件更换维修加固一览表', type: 'file' },
          { name: '施工单位签字', type: 'signature' },
          { name: '总监理工程师审查意见', type: 'signature' },
        ]}),
        default_content: '致：（监理单位）\n我方已按合同要求完成了 工程，经自检合格，请予以检查和验收。\n\n附录：\n1.质量保证资料\n2.隐蔽工程验收资料\n3.分部/分项工程验收资料\n4.构件编号图\n5.构件登记一览表\n6.构件更换、维修、加固一览表\n7.其它\n\n经初步审查，该工程符合/不符合我国现行法律、法规；符合/不符合我国现行文物工程验收标准；符合/不符合设计文件要求；符合/不符合施工合同要求。综上所述，该工程可以/不可以进行初步验收。\n\n注：本表仅为审查具备验收条件的工程表格，合格工程另有监理工程师签发工程质量认可书表格',
      },
      {
        template_code: 'A.13', name: '工程临时延期申请表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '申请表',
        description: '工程工期延期的申请',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '合同条款', type: 'text', required: true },
          { name: '延期原因', type: 'textarea', required: true },
          { name: '合同竣工日期', type: 'date' },
          { name: '申请延长日期', type: 'date' },
          { name: '证明材料', type: 'file' },
          { name: '延期依据及计算', type: 'textarea' },
          { name: '施工单位签字', type: 'signature' },
        ]}),
        default_content: '致：（监理单位）\n根据施工合同条款 条的规定，由于 原因，造成工程延误，我方申请工程延期，请予以批准。',
      },
      {
        template_code: 'A.14', name: '费用索赔申请表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '申请表',
        description: '工程费用索赔申请',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '合同条款', type: 'text', required: true },
          { name: '索赔原因', type: 'textarea', required: true },
          { name: '索赔金额大写', type: 'text', required: true },
          { name: '索赔金额小写', type: 'number', required: true },
          { name: '索赔详细理由', type: 'textarea' },
          { name: '索赔金额计算', type: 'textarea' },
          { name: '证明材料', type: 'file' },
          { name: '施工单位签字', type: 'signature' },
        ]}),
        default_content: '致：（监理单位）\n根据施工合同条款第 条的规定，由于 原因，我方要求索赔金额（大写）（小写），请予以批准。',
      },
      {
        template_code: 'A.15', name: '构件更换、维修、加固登记一览表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '登记表',
        description: '构件更换、维修、加固的详细登记',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '构件清单', type: 'textarea', required: true },
          { name: '更换维修加固内容', type: 'textarea' },
          { name: '施工单位自检结果', type: 'signature' },
          { name: '监理工程师意见', type: 'signature' },
          { name: '业主单位意见', type: 'signature' },
        ]}),
        default_content: '用于记录构件更换、维修、加固的详细信息',
      },
      {
        template_code: 'A.16', name: '工程变更费用申请表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '申请表',
        description: '工程变更引起费用调整的申请',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '监理单位', type: 'text', required: true },
          { name: '变更内容', type: 'textarea', required: true },
          { name: '变更费用', type: 'number', required: true },
          { name: '变更原因', type: 'textarea' },
          { name: '施工单位签字', type: 'signature' },
          { name: '监理工程师意见', type: 'signature' },
          { name: '业主单位意见', type: 'signature' },
        ]}),
        default_content: '用于工程变更费用的申请',
      },
      {
        template_code: 'A.17', name: '工程质量问题处理记录表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '记录表',
        description: '工程质量问题的发现与处理记录',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '质量问题描述', type: 'textarea', required: true },
          { name: '处理措施', type: 'textarea' },
          { name: '处理结果', type: 'textarea' },
          { name: '施工单位签字', type: 'signature' },
          { name: '监理工程师签字', type: 'signature' },
          { name: '业主单位签字', type: 'signature' },
        ]}),
        default_content: '用于记录工程质量问题的处理过程',
      },
      {
        template_code: 'A.18', name: '工程验收记录表', heritage_type: '古建筑', doc_category: '竣工验收', doc_type: '记录表',
        description: '工程正式验收的完整记录',
        table_schema: JSON.stringify({ fields: [
          { name: '工程名称', type: 'text', required: true },
          { name: '编号', type: 'text', required: true },
          { name: '验收日期', type: 'date', required: true },
          { name: '验收内容', type: 'textarea', required: true },
          { name: '验收结论', type: 'textarea' },
          { name: '施工单位签字', type: 'signature' },
          { name: '监理单位签字', type: 'signature' },
          { name: '设计单位签字', type: 'signature' },
          { name: '业主单位签字', type: 'signature' },
        ]}),
        default_content: '用于工程验收的正式记录',
      },
    ];

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO templates (template_code, name, heritage_type, doc_category, doc_type, description, table_schema, default_content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    systemTemplates.forEach(t => {
      const result = insertStmt.run(
        t.template_code, t.name, t.heritage_type, t.doc_category, t.doc_type,
        t.description, t.table_schema, t.default_content
      );
      if (result.changes > 0) inserted++;
    });

    res.json({
      success: true,
      message: `成功初始化 ${inserted}/${systemTemplates.length} 个文物保护工程标准模板`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
