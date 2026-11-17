import { MigrationInterface, QueryRunner } from 'typeorm';
import { c, ensureTable, idx } from '../ddl';

function commonColumns() {
  return [
    c('id', "BIGINT NOT NULL COMMENT 'id(雪花)'"),
    c('org_id', "BIGINT NOT NULL COMMENT '组织id'"),
    c('creator_id', "BIGINT NULL COMMENT '创建人id'"),
    c('created_at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间'"),
    c('modifier_id', "BIGINT NULL COMMENT '修改人id'"),
    c('modified_at', "DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '修改时间'"),
  ];
}

/**
 * WP03 审批流数据表迁移。
 *
 * 节点会签模式及阈值保存在 model_json 中：
 * any / all / ratio / votes / sequential。
 *
 * 终审通过、实例完成和 L1 audit 必须由引擎在同一事务执行；
 * 表结构本身不执行单据状态变更。
 */
export class Workflow1794500000005 implements MigrationInterface {
  name = 'Workflow1794500000005';

  async up(qr: QueryRunner): Promise<void> {
    await ensureTable(qr, {
      name: 'wf_definition',
      comment: '审批流程版本定义',
      columns: [
        ...commonColumns(),
        c('def_key', "VARCHAR(80) NOT NULL COMMENT '流程定义标识'"),
        c('name', "VARCHAR(100) NOT NULL COMMENT '流程名称'"),
        c('form', "VARCHAR(50) NOT NULL COMMENT '单据对象代码'"),
        c('version', "INT NOT NULL DEFAULT 1 COMMENT '定义版本号'"),
        c('bpmn_xml', "MEDIUMTEXT NULL COMMENT '流程BPMN XML'"),
        c('model_json', "JSON NOT NULL COMMENT '流程模型及节点会签规则'"),
        c('status', "VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT '状态 DRAFT/PUBLISHED/DISABLED'"),
      ],
      indexes: [
        idx('uk_def_version', ['def_key', 'version'], true),
        idx('ix_org_form_status', ['org_id', 'form', 'status']),
      ],
    });

    await ensureTable(qr, {
      name: 'wf_template',
      comment: '审批流程适用模板',
      columns: [
        ...commonColumns(),
        c('form', "VARCHAR(50) NOT NULL COMMENT '单据对象代码'"),
        c('bill_type_id', "BIGINT NULL COMMENT '单据类型id，空表示不限'"),
        c('definition_key', "VARCHAR(80) NOT NULL COMMENT '流程定义标识'"),
        c('start_condition', "TEXT NULL COMMENT '启动条件表达式，空表示无条件'"),
        c('eff_date', "DATETIME(3) NULL COMMENT '生效时间，空表示不限制'"),
        c('exp_date', "DATETIME(3) NULL COMMENT '失效时间，空表示不限制'"),
        c('enabled', "TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用'"),
        c('priority', "INT NOT NULL DEFAULT 0 COMMENT '匹配优先级，数值越大越优先'"),
        c('node_view_json', "JSON NULL COMMENT '节点展示配置'"),
      ],
      indexes: [
        idx('ix_template_match', ['org_id', 'form', 'enabled', 'priority']),
        idx('ix_bill_type', ['bill_type_id']),
        idx('ix_definition_key', ['definition_key']),
      ],
    });

    await ensureTable(qr, {
      name: 'wf_instance',
      comment: '审批流程实例',
      columns: [
        ...commonColumns(),
        c('definition_id', "BIGINT NOT NULL COMMENT '本次采用的流程定义版本id'"),
        c('template_id', "BIGINT NULL COMMENT '启动时匹配的模板id'"),
        c('form', "VARCHAR(50) NOT NULL COMMENT '单据对象代码'"),
        c('bill_id', "BIGINT NOT NULL COMMENT '单据头id'"),
        c('bill_no', "VARCHAR(100) NOT NULL COMMENT '单据编号'"),
        c('starter_id', "BIGINT NOT NULL COMMENT '发起人id'"),
        c('status', "VARCHAR(20) NOT NULL DEFAULT 'RUNNING' COMMENT '状态 RUNNING/COMPLETED/REJECTED/WITHDRAWN/TERMINATED'"),
        c('current_nodes_json', "JSON NOT NULL COMMENT '当前活动节点标识数组'"),
        c('round', "INT NOT NULL DEFAULT 1 COMMENT '流程轮次，驳回重进时递增'"),
        c('started_at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '启动时间'"),
        c('ended_at', "DATETIME(3) NULL COMMENT '结束时间'"),
        c(
          'running_key',
          "BIGINT GENERATED ALWAYS AS (CASE WHEN `status` = 'RUNNING' THEN `bill_id` ELSE NULL END) STORED COMMENT '运行中单据id，用于限制重复启动'",
        ),
      ],
      indexes: [
        idx('uk_running_bill', ['org_id', 'form', 'running_key'], true),
        idx('ix_bill', ['org_id', 'form', 'bill_id']),
        idx('ix_starter_status', ['org_id', 'starter_id', 'status']),
        idx('ix_definition', ['definition_id']),
        idx('ix_template', ['template_id']),
      ],
    });

    await ensureTable(qr, {
      name: 'wf_delegate',
      comment: '审批代理授权',
      columns: [
        ...commonColumns(),
        c('delegator_id', "BIGINT NOT NULL COMMENT '委托人id'"),
        c('delegatee_id', "BIGINT NOT NULL COMMENT '代理人id'"),
        c('form_scope', "TEXT NULL COMMENT '适用单据对象代码，逗号分隔，空表示全部'"),
        c('eff_from', "DATETIME(3) NOT NULL COMMENT '代理生效时间'"),
        c('eff_to', "DATETIME(3) NOT NULL COMMENT '代理失效时间'"),
        c('enabled', "TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用'"),
      ],
      indexes: [
        idx('ix_delegator_effective', ['org_id', 'delegator_id', 'enabled', 'eff_from', 'eff_to']),
        idx('ix_delegatee', ['org_id', 'delegatee_id', 'enabled']),
        idx('ix_expiry', ['enabled', 'eff_to']),
      ],
    });

    await ensureTable(qr, {
      name: 'wf_task',
      comment: '审批任务',
      columns: [
        ...commonColumns(),
        c('instance_id', "BIGINT NOT NULL COMMENT '流程实例id'"),
        c('node_key', "VARCHAR(100) NOT NULL COMMENT '节点标识'"),
        c('owner_id', "BIGINT NOT NULL COMMENT '应处理人本人id'"),
        c('assignee_id', "BIGINT NOT NULL COMMENT '当前处理人id，代理期间为代理人'"),
        c('delegate_id', "BIGINT NULL COMMENT '当前生效的代理授权id'"),
        c('seq', "INT NOT NULL DEFAULT 1 COMMENT '顺序会签次序'"),
        c('round', "INT NOT NULL DEFAULT 1 COMMENT '同一节点执行轮次，驳回重进时递增'"),
        c('vote', "VARCHAR(10) NULL COMMENT '审批投票 AGREE/DISAGREE，未投票为空'"),
        c('status', "VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态 PENDING/WAITING/DONE/CANCELED/TRANSFERRED/CC'"),
        c('is_cc', "TINYINT NOT NULL DEFAULT 0 COMMENT '是否为抄送任务'"),
        c('add_sign_from', "BIGINT NULL COMMENT '加签来源任务id'"),
        c('due_at', "DATETIME(3) NULL COMMENT '任务截止时间'"),
        c('done_at', "DATETIME(3) NULL COMMENT '任务结束时间'"),
        c('opinion', "TEXT NULL COMMENT '审批意见'"),
      ],
      indexes: [
        idx('ix_assignee_status', ['assignee_id', 'status']),
        idx('ix_instance_node_round', ['instance_id', 'node_key', 'round']),
        idx('ix_instance_status', ['instance_id', 'status']),
        idx('ix_owner_status', ['owner_id', 'status']),
        idx('ix_delegate_status', ['delegate_id', 'status']),
        idx('ix_status_due', ['status', 'due_at']),
        idx('ix_add_sign_from', ['add_sign_from']),
      ],
    });

    await ensureTable(qr, {
      name: 'wf_action_log',
      comment: '审批操作日志',
      columns: [
        ...commonColumns(),
        c('instance_id', "BIGINT NOT NULL COMMENT '流程实例id'"),
        c('task_id', "BIGINT NULL COMMENT '关联任务id，实例级操作为空'"),
        c('node_key', "VARCHAR(100) NULL COMMENT '操作发生的节点标识'"),
        c('round', "INT NOT NULL DEFAULT 1 COMMENT '操作发生时的执行轮次'"),
        c('action', "VARCHAR(40) NOT NULL COMMENT '操作 AGREE/REJECT/TRANSFER/ADD_SIGN/WITHDRAW/TERMINATE/DELEGATE/RETURN/CC'"),
        c('target_node_key', "VARCHAR(100) NULL COMMENT '驳回或流转的目标节点标识'"),
        c('opinion', "TEXT NULL COMMENT '操作意见'"),
        c('sign_image', "VARCHAR(512) NULL COMMENT '签名图片存储键'"),
        c('user_id', "BIGINT NOT NULL COMMENT '实际操作人id'"),
        c('at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '操作时间'"),
        c('action_data_json', "JSON NULL COMMENT '操作扩展参数，记录转交及加签等上下文'"),
      ],
      indexes: [
        idx('ix_instance_at', ['instance_id', 'at', 'id']),
        idx('ix_task_at', ['task_id', 'at', 'id']),
        idx('ix_user_at', ['org_id', 'user_id', 'at']),
      ],
    });

    await ensureTable(qr, {
      name: 'wf_node_timeout',
      comment: '审批任务超时提醒计划',
      columns: [
        ...commonColumns(),
        c('task_id', "BIGINT NOT NULL COMMENT '审批任务id'"),
        c('remind_at', "DATETIME(3) NOT NULL COMMENT '计划提醒时间'"),
        c('reminded', "TINYINT NOT NULL DEFAULT 0 COMMENT '是否已提醒'"),
        c('reminded_at', "DATETIME(3) NULL COMMENT '实际提醒时间'"),
      ],
      indexes: [
        idx('uk_task_remind', ['task_id', 'remind_at'], true),
        idx('ix_pending_remind', ['reminded', 'remind_at']),
      ],
    });

    await ensureTable(qr, {
      name: 'wf_variable',
      comment: '审批流程实例变量',
      columns: [
        ...commonColumns(),
        c('instance_id', "BIGINT NOT NULL COMMENT '流程实例id'"),
        c('key', "VARCHAR(100) NOT NULL COMMENT '变量标识'"),
        c('value', "JSON NOT NULL COMMENT '变量值'"),
      ],
      indexes: [
        idx('uk_instance_key', ['instance_id', 'key'], true),
      ],
    });
  }

  async down(): Promise<void> {
    // 沿用已有迁移策略：生产与共享库保留审批表及审批历史。
  }
}
