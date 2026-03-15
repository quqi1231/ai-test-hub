# AI-TestHub 数据库架构设计

## 📊 总体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AI-TestHub 系统架构                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│  │   Users  │    │ Projects │    │Plugins   │    │  Envs    │        │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘        │
│       │               │               │               │               │
│       └───────────────┼───────────────┼───────────────┘               │
│                       │               │                                   │
│                       ▼               ▼                                   │
│                  ┌──────────┐    ┌──────────┐                           │
│                  │Interface │    │   Test   │                           │
│                  │   s     │    │  Cases   │                           │
│                  └────┬─────┘    └────┬─────┘                           │
│                       │               │                                  │
│                       │    ┌──────────┘                                  │
│                       │    │                                               │
│                       ▼    ▼                                               │
│                  ┌──────────────┐                                         │
│                  │ TestResults  │                                         │
│                  └──────────────┘                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 数据表结构

### 1. 用户表 (users)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 用户ID |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 用户名 |
| email | VARCHAR(100) | UNIQUE, NOT NULL | 邮箱 |
| password | VARCHAR(255) | NOT NULL | 密码(哈希) |
| is_active | BOOLEAN | DEFAULT TRUE | 是否激活 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2. 项目表 (projects)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 项目ID |
| name | VARCHAR(100) | NOT NULL | 项目名称 |
| description | VARCHAR(500) | NULL | 项目描述 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE | 更新时间 |

```sql
CREATE TABLE projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

### 3. 接口表 (interfaces)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 接口ID |
| project_id | INT | FK -> projects.id | 所属项目 |
| name | VARCHAR(100) | NOT NULL | 接口名称 |
| method | VARCHAR(10) | NOT NULL | 请求方法 |
| url | VARCHAR(500) | NOT NULL | 请求URL |
| description | VARCHAR(500) | NULL | 接口描述 |
| headers | JSON | NULL | 请求头 |
| params | JSON | NULL | URL参数 |
| body | JSON | NULL | 请求体 |
| body_type | VARCHAR(20) | DEFAULT 'json' | 请求体类型 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE | 更新时间 |

```sql
CREATE TABLE interfaces (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    url VARCHAR(500) NOT NULL,
    description VARCHAR(500),
    headers JSON,
    params JSON,
    body JSON,
    body_type VARCHAR(20) DEFAULT 'json',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

### 4. 测试用例表 (test_cases)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 用例ID |
| project_id | INT | FK -> projects.id | 所属项目 |
| interface_id | INT | FK -> interfaces.id | 关联接口 |
| name | VARCHAR(100) | NOT NULL | 用例名称 |
| description | VARCHAR(500) | NULL | 用例描述 |
| request_config | JSON | NULL | 请求配置 |
| assertions | JSON | NULL | 断言配置 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE | 更新时间 |

```sql
CREATE TABLE test_cases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    interface_id INT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    request_config JSON,
    assertions JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE SET NULL
);
```

---

### 5. 测试结果表 (test_results)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 结果ID |
| case_id | INT | FK -> test_cases.id | 关联用例 |
| status | VARCHAR(20) | NOT NULL | 状态(success/fail/error) |
| response | JSON | NULL | 响应内容 |
| error_message | VARCHAR(1000) | NULL | 错误信息 |
| duration_ms | INT | NULL | 执行耗时(毫秒) |
| executed_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 执行时间 |

```sql
CREATE TABLE test_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    case_id INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    response JSON,
    error_message VARCHAR(1000),
    duration_ms INT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES test_cases(id) ON DELETE CASCADE
);
```

---

### 6. 插件表 (plugins)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 插件ID |
| name | VARCHAR(100) | NOT NULL | 插件名称 |
| description | VARCHAR(500) | NULL | 插件描述 |
| version | VARCHAR(20) | NULL | 版本号 |
| config | JSON | NULL | 插件配置 |
| is_enabled | BOOLEAN | DEFAULT TRUE | 是否启用 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

```sql
CREATE TABLE plugins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    version VARCHAR(20),
    config JSON,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔗 ER 关系图

```
┌─────────┐       ┌────────────┐       ┌─────────────┐
│  users  │       │  projects  │       │  plugins   │
└────┬────┘       └─────┬──────┘       └──────┬─────┘
     │                  │                      │
     │                  │                      │
     │                  ▼                      │
     │           ┌────────────┐                │
     │           │interfaces  │                │
     │           └─────┬──────┘                │
     │                 │                       │
     │                 ▼                        │
     │           ┌────────────┐                 │
     │           │ test_cases│                 │
     │           └─────┬──────┘                 │
     │                 │                        │
     │                 ▼                        │
     │           ┌────────────┐                 │
     └──────────►│test_results│◄───────────────┘
                 └────────────┘
```

---

## 📌 索引设计

```sql
-- 项目表索引
CREATE INDEX idx_projects_name ON projects(name);

-- 接口表索引
CREATE INDEX idx_interfaces_project ON interfaces(project_id);
CREATE INDEX idx_interfaces_method ON interfaces(method);

-- 测试用例索引
CREATE INDEX idx_cases_project ON test_cases(project_id);
CREATE INDEX idx_cases_interface ON test_cases(interface_id);

-- 测试结果索引
CREATE INDEX idx_results_case ON test_results(case_id);
CREATE INDEX idx_results_status ON test_results(status);
CREATE INDEX idx_results_executed ON test_results(executed_at);
```

---

## 📡 API 接口清单

### 用户认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户 |
| PUT | /api/auth/password | 修改密码 |

### 项目管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects/ | 获取项目列表 |
| POST | /api/projects/ | 创建项目 |
| GET | /api/projects/{id} | 获取项目详情 |
| PUT | /api/projects/{id} | 更新项目 |
| DELETE | /api/projects/{id} | 删除项目 |

### 接口管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/interfaces/ | 获取接口列表 |
| POST | /api/interfaces/ | 创建接口 |
| GET | /api/interfaces/{id} | 获取接口详情 |
| PUT | /api/interfaces/{id} | 更新接口 |
| DELETE | /api/interfaces/{id} | 删除接口 |
| POST | /api/interfaces/execute | 执行接口 |
| POST | /api/interfaces/import | 导入接口 |

### 用例管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/cases/ | 获取用例列表 |
| POST | /api/cases/ | 创建用例 |
| GET | /api/cases/{id} | 获取用例详情 |
| PUT | /api/cases/{id} | 更新用例 |
| DELETE | /api/cases/{id} | 删除用例 |
| POST | /api/cases/{id}/run | 执行用例 |

### 测试结果
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/results/ | 获取结果列表 |
| GET | /api/results/{id} | 获取结果详情 |
| GET | /api/results/case/{case_id} | 获取用例结果 |

### 插件管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/plugins/ | 获取插件列表 |
| POST | /api/plugins/ | 创建插件 |
| PUT | /api/plugins/{id} | 更新插件 |
| DELETE | /api/plugins/{id} | 删除插件 |
| POST | /api/plugins/{id}/toggle | 启用/禁用插件 |

---

## 🔧 扩展表（可选）

### 环境配置表 (environments)
```sql
CREATE TABLE environments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    base_url VARCHAR(200),
    variables JSON,
    headers JSON,
    is_active BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### 接口链表 (interface_chains)
```sql
CREATE TABLE interface_chains (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    steps JSON NOT NULL,
    global_vars JSON,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### 数据源表 (data_sources)
```sql
CREATE TABLE data_sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    source_type VARCHAR(20) NOT NULL,
    file_path VARCHAR(500),
    data JSON,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```
