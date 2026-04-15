import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '../database/heritagedoc.db')
console.log('导入脚本使用的数据库路径:', DB_PATH)

// 表格模板数据 - 从文物工程全套资料表格.doc提取
const templates = [
  {
    code: 'A.1',
    name: '工程开工报审表',
    category: '施工阶段',
    type: '报审表',
    description: '施工单位申请开工的报审表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '监理单位', type: 'text', required: true },
        { name: '申请内容', type: 'textarea', required: true },
        { name: '附件清单', type: 'textarea' },
        { name: '施工单位意见', type: 'signature' },
        { name: '项目经理签字', type: 'signature' },
        { name: '监理工程师意见', type: 'signature' },
        { name: '总监理工程师意见', type: 'signature' }
      ]
    }),
    content: `致：（监理单位）
我方承担的 工程，已完成了施工前各项准备工作，具备了开工条件，特此申请施工，请核查并签发开工指令。

附件：
1、开工报告
2、证明文件
3、准备阶段资料`
  },
  {
    code: 'A.2',
    name: '工程开工报告表',
    category: '施工阶段',
    type: '报告表',
    description: '工程开工的正式报告表格',
    schema: JSON.stringify({
      fields: [
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
        { name: '总监理工程师签字', type: 'signature' }
      ]
    }),
    content: `本表一式三份，业主单位、监理单位、施工单位各一份`
  },
  {
    code: 'A.3',
    name: '施工组织设计（方案）报审表',
    category: '施工阶段',
    type: '报审表',
    description: '施工组织设计或方案的报审表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '监理单位', type: 'text', required: true },
        { name: '方案内容简述', type: 'textarea', required: true },
        { name: '附录', type: 'file' },
        { name: '施工单位签字', type: 'signature' },
        { name: '监理工程师签字', type: 'signature' },
        { name: '总监理工程师签字', type: 'signature' }
      ]
    }),
    content: `致：（监理单位）
我方已根据施工合同的有关规定完成了 工程施工组织设计（方案）的编制，并经我单位技术负责人审查批准，请予以审查。

附录：施工组织设计（方案）`
  },
  {
    code: 'A.4',
    name: '分包单位资格报审表',
    category: '施工阶段',
    type: '报审表',
    description: '分包单位资质报审表格',
    schema: JSON.stringify({
      fields: [
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
        { name: '总监理工程师审查意见', type: 'signature' }
      ]
    }),
    content: `经考察，我方认为拟选择的（分包单位），具有承担下列分包工程的施工资质和施工技术能力，可以保证本工程按合同的规定进行施工。分包后，我方仍承担施工的全部责任。请予以批准。

附件：
1、分包单位资质资料
2、分包单位业绩`
  },
  {
    code: 'A.5',
    name: '隐蔽工程现场检查申请表',
    category: '施工阶段',
    type: '申请表',
    description: '隐蔽工程检查申请表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '分部分项工程名称', type: 'text', required: true },
        { name: '勘察设计单位', type: 'text' },
        { name: '检查内容及简图', type: 'textarea' },
        { name: '施工单位技术负责人签字', type: 'signature' },
        { name: '监理工程师签字', type: 'signature' },
        { name: '业主单位工地负责人签字', type: 'signature' }
      ]
    }),
    content: `用于隐蔽工程现场检查申请`
  },
  {
    code: 'A.6',
    name: '分部/分项工程报验申请表',
    category: '施工阶段',
    type: '申请表',
    description: '分部分项工程报验申请表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '监理单位', type: 'text', required: true },
        { name: '分部分项工程名称', type: 'text', required: true },
        { name: '附件清单', type: 'textarea' },
        { name: '施工单位签字', type: 'signature' },
        { name: '总监理工程师签字', type: 'signature' }
      ]
    }),
    content: `致：（监理单位）
我方已完成了 分部/分项工程施工，现报上该分部/分项工程报验申请表，请予以审查和验收。

附件：
1、现场检查记录
2、质量保证资料

注：本表仅为审查具备验收条件的工程表格，合格工程另有总监理工程师签发工程质量认可表格`
  },
  {
    code: 'A.7',
    name: '工程材料/构配件/设备报审表',
    category: '施工阶段',
    type: '报审表',
    description: '工程材料构配件设备报审表格',
    schema: JSON.stringify({
      fields: [
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
        { name: '监理审查意见', type: 'signature' }
      ]
    }),
    content: `致：（监理单位）
我方于 年 月 日进场的工程材料/构配件/设备数量登记如下（见附表）。现将质量证明文件及自检结果报上，拟用于下列部位：
请予以审核。

附件：
1、数量清单
2、质量证明文件
3、自检结果

经检查上述内容，符合/不符合设计文件和规范要求，准许/不准许进场，同意/不同意使用于拟定部位。`
  },
  {
    code: 'A.8',
    name: '古建筑拆卸构件登记一览表',
    category: '施工阶段',
    type: '登记表',
    description: '古建筑拆卸构件登记表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '构件清单', type: 'textarea', required: true },
        { name: '初步处理意见', type: 'textarea' },
        { name: '业主单位检查结果', type: 'signature' },
        { name: '监理工程师复查意见', type: 'signature' },
        { name: '施工单位自检结果', type: 'signature' }
      ]
    }),
    content: `用于记录古建筑拆卸构件的详细信息`
  },
  {
    code: 'A.9',
    name: '工程款支付申请表',
    category: '施工阶段',
    type: '申请表',
    description: '工程款支付申请表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '监理单位', type: 'text', required: true },
        { name: '完成工作内容', type: 'textarea', required: true },
        { name: '应支付日期', type: 'date', required: true },
        { name: '支付金额大写', type: 'text', required: true },
        { name: '支付金额小写', type: 'number', required: true },
        { name: '工程量清单', type: 'file' },
        { name: '计算方法', type: 'file' },
        { name: '施工单位签字', type: 'signature' }
      ]
    }),
    content: `致：（监理单位）
我方已完成了 工作，按施工合同的规定，业主应在 年 月 日前支付该项工程款共（大写）（小写），现报上 工程付款申请表，请予以审查，并开具工程款支付证书。

附件：
1.工程量清单
2.计算方法`
  },
  {
    code: 'A.10',
    name: '监理工程师通知回复单',
    category: '施工阶段',
    type: '回复单',
    description: '监理工程师通知回复表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '监理单位', type: 'text', required: true },
        { name: '通知编号', type: 'text', required: true },
        { name: '完成工作内容', type: 'textarea', required: true },
        { name: '详细内容', type: 'textarea' },
        { name: '施工单位签字', type: 'signature' },
        { name: '总监理工程师签字', type: 'signature' }
      ]
    }),
    content: `致：（监理单位）
我方接到编号为 的监理工程师通知后，已按要求完成了 工作，现报上，请予以复查。`
  },
  {
    code: 'A.11',
    name: '工程复工申请表',
    category: '施工阶段',
    type: '申请表',
    description: '工程复工申请表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '监理单位', type: 'text', required: true },
        { name: '停工令编号', type: 'text', required: true },
        { name: '整改工作内容', type: 'textarea', required: true },
        { name: '具体整改内容', type: 'textarea' },
        { name: '施工单位签字', type: 'signature' },
        { name: '总监理工程师签字', type: 'signature' }
      ]
    }),
    content: `致：（监理单位）
我方接收到编号为 的工程暂时停工令后，已按要求完成了 整改工作，现报上，请现场予以检查验收。`
  },
  {
    code: 'A.12',
    name: '工程竣工报验单',
    category: '竣工验收',
    type: '报验单',
    description: '工程竣工报验表格',
    schema: JSON.stringify({
      fields: [
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
        { name: '总监理工程师审查意见', type: 'signature' }
      ]
    }),
    content: `致：（监理单位）
我方已按合同要求完成了 工程，经自检合格，请予以检查和验收。

附录：
1.质量保证资料
2.隐蔽工程验收资料
3.分部/分项工程验收资料
4.构件编号图
5.构件登记一览表
6.构件更换、维修、加固一览表
7.其它

经初步审查，该工程符合/不符合我国现行法律、法规；符合/不符合我国现行文物工程验收标准；符合/不符合设计文件要求；符合/不符合施工合同要求。综上所述，该工程可以/不可以进行初步验收。

注：本表仅为审查具备验收条件的工程表格，合格工程另有监理工程师签发工程质量认可书表格`
  },
  {
    code: 'A.13',
    name: '工程临时延期申请表',
    category: '施工阶段',
    type: '申请表',
    description: '工程临时延期申请表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '监理单位', type: 'text', required: true },
        { name: '合同条款', type: 'text', required: true },
        { name: '延期原因', type: 'textarea', required: true },
        { name: '合同竣工日期', type: 'date' },
        { name: '申请延长日期', type: 'date' },
        { name: '证明材料', type: 'file' },
        { name: '延期依据及计算', type: 'textarea' },
        { name: '施工单位签字', type: 'signature' }
      ]
    }),
    content: `致：（监理单位）
根据施工合同条款 条的规定，由于 原因，造成工程延误，我方申请工程延期，请予以批准。`
  },
  {
    code: 'A.14',
    name: '费用索赔申请表',
    category: '施工阶段',
    type: '申请表',
    description: '费用索赔申请表格',
    schema: JSON.stringify({
      fields: [
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
        { name: '施工单位签字', type: 'signature' }
      ]
    }),
    content: `致：（监理单位）
根据施工合同条款第 条的规定，由于 原因，我方要求索赔金额（大写）（小写），请予以批准。`
  },
  {
    code: 'A.15',
    name: '构件更换、维修、加固登记一览表',
    category: '施工阶段',
    type: '登记表',
    description: '构件更换维修加固登记表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '构件清单', type: 'textarea', required: true },
        { name: '更换维修加固内容', type: 'textarea' },
        { name: '施工单位自检结果', type: 'signature' },
        { name: '监理工程师意见', type: 'signature' },
        { name: '业主单位意见', type: 'signature' }
      ]
    }),
    content: `用于记录构件更换、维修、加固的详细信息`
  },
  {
    code: 'A.16',
    name: '工程变更费用申请表',
    category: '施工阶段',
    type: '申请表',
    description: '工程变更费用申请表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '监理单位', type: 'text', required: true },
        { name: '变更内容', type: 'textarea', required: true },
        { name: '变更费用', type: 'number', required: true },
        { name: '变更原因', type: 'textarea' },
        { name: '施工单位签字', type: 'signature' },
        { name: '监理工程师意见', type: 'signature' },
        { name: '业主单位意见', type: 'signature' }
      ]
    }),
    content: `用于工程变更费用的申请`
  },
  {
    code: 'A.17',
    name: '工程质量问题处理记录表',
    category: '施工阶段',
    type: '记录表',
    description: '工程质量问题处理记录表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '质量问题描述', type: 'textarea', required: true },
        { name: '处理措施', type: 'textarea' },
        { name: '处理结果', type: 'textarea' },
        { name: '施工单位签字', type: 'signature' },
        { name: '监理工程师签字', type: 'signature' },
        { name: '业主单位签字', type: 'signature' }
      ]
    }),
    content: `用于记录工程质量问题的处理过程`
  },
  {
    code: 'A.18',
    name: '工程验收记录表',
    category: '竣工验收',
    type: '记录表',
    description: '工程验收记录表格',
    schema: JSON.stringify({
      fields: [
        { name: '工程名称', type: 'text', required: true },
        { name: '编号', type: 'text', required: true },
        { name: '验收日期', type: 'date', required: true },
        { name: '验收内容', type: 'textarea', required: true },
        { name: '验收结论', type: 'textarea' },
        { name: '施工单位签字', type: 'signature' },
        { name: '监理单位签字', type: 'signature' },
        { name: '设计单位签字', type: 'signature' },
        { name: '业主单位签字', type: 'signature' }
      ]
    }),
    content: `用于工程验收的正式记录`
  }
]

// 导入模板到数据库
const importTemplates = async () => {
  const db = new sqlite3.Database(DB_PATH)
  
  console.log('开始导入表格模板...')
  
  // 先创建 templates 表（如果不存在）
  await new Promise<void>((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        template_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        heritage_type TEXT,
        doc_category TEXT,
        doc_type TEXT,
        table_schema TEXT,
        default_content TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) reject(err)
      else {
        console.log('✅ templates 表已创建')
        resolve()
      }
    })
  })
  
  let successCount = 0
  let errorCount = 0
  
  for (const template of templates) {
    try {
      await new Promise<void>((resolve, reject) => {
        const stmt = db.prepare(
          `INSERT OR REPLACE INTO templates (
            id, template_code, name, heritage_type, doc_category, doc_type, 
            table_schema, default_content, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        
        stmt.run(
          [
            'template-' + template.code,
            template.code,
            template.name,
            '古建筑', // 默认文物类型
            template.category,
            template.type,
            template.schema,
            template.content,
            template.description
          ],
          function(err: any) {
            if (err) {
              console.error(`导入模板 ${template.code} 失败:`, err)
              errorCount++
              reject(err)
            } else {
              console.log(`✅ 已导入模板: ${template.code} - ${template.name} (ID: ${this.lastID})`)
              successCount++
              resolve()
            }
          }
        );
        stmt.finalize();
      })
    } catch (err) {
      console.error(`导入模板 ${template.code} 失败:`, err)
      errorCount++
    }
  }
  
  db.close()
  
  console.log('\n导入完成!')
  console.log(`成功: ${successCount} 个模板`)
  console.log(`失败: ${errorCount} 个模板`)
}

importTemplates().catch(console.error)
