"""
接口管理 API
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.database import get_db
from app.schemas.interface import InterfaceCreate, InterfaceUpdate, InterfaceResponse, InterfaceListResponse, ImportRequest
import json
import yaml
import io
from app.services.import_service import import_interfaces
from app.services.executor import executor
from openpyxl import Workbook

# 导入 Interface 模型
from app.models.models import Interface

router = APIRouter()

@router.get("/template")
async def download_template(format: str = "excel"):
    """下载导入模板
    
    支持格式: excel, json, yaml
    """
    if format == "excel":
        # 生成 Excel 模板
        wb = Workbook()
        ws = wb.active
        ws.title = "接口导入模板"
        
        # 表头
        headers = ["name", "method", "url", "description", "headers", "params", "body", "body_type", "var_extracts", "assertions"]
        ws.append(headers)
        
        # 示例数据
        ws.append([
            "示例接口",
            "POST",
            "https://api.example.com/users",
            "获取用户列表",
            '{"Content-Type": "application/json"}',
            '{"page": 1, "size": 10}',
            '{"name": "test"}',
            "json",
            '{"token": "$.data.token"}',
            '[{"type": "status", "expected": 200}]'
        ])
        
        # 空行示例
        ws.append(["", "", "", "", "", "", "", "", "", ""])
        
        # 保存到内存
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        
        # 读取所有内容
        content = buffer.getvalue()
        
        return Response(
            content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=interface_template.xlsx"}
        )
    
    elif format == "json":
        template = [
            {
                "name": "示例接口",
                "method": "POST",
                "url": "https://api.example.com/users",
                "description": "获取用户列表",
                "headers": {"Content-Type": "application/json"},
                "params": {"page": 1, "size": 10},
                "body": {"name": "test"},
                "body_type": "json",
                "var_extracts": {"token": "$.data.token"},
                "assertions": [{"type": "status", "expected": 200}]
            }
        ]
        return Response(
            json.dumps(template, indent=2, ensure_ascii=False),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=interface_template.json"}
        )
    
    elif format == "yaml":
        template = [
            {
                "name": "示例接口",
                "method": "POST",
                "url": "https://api.example.com/users",
                "description": "获取用户列表",
                "headers": {"Content-Type": "application/json"},
                "params": {"page": 1, "size": 10},
                "body": {"name": "test"},
                "body_type": "json",
                "var_extracts": {"token": "$.data.token"},
                "assertions": [{"type": "status", "expected": 200}]
            }
        ]
        yaml_content = yaml.dump(template, allow_unicode=True, default_flow_style=False)
        return Response(
            yaml_content,
            media_type="application/x-yaml",
            headers={"Content-Disposition": "attachment; filename=interface_template.yaml"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="不支持的格式")


@router.get("/", response_model=InterfaceListResponse)
async def list_interfaces(project_id: int = None, favorites_only: bool = False, skip: int = 0, limit: int = 100, search: str = None, db: Session = Depends(get_db)):
    """获取接口列表
    
    Args:
        project_id: 项目ID筛选
        favorites_only: 仅返回收藏的接口
        search: 搜索关键词（搜索name和url）
    """
    query = db.query(Interface)
    if project_id:
        query = query.filter(Interface.project_id == project_id)
    if favorites_only:
        query = query.filter(Interface.is_favorite == True)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Interface.name.ilike(search_pattern)) | 
            (Interface.url.ilike(search_pattern))
        )
    
    # 收藏的接口排在前面
    query = query.order_by(Interface.is_favorite.desc(), Interface.id.desc())
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return {"items": items, "total": total}


@router.patch("/{interface_id}/favorite")
async def toggle_favorite(interface_id: int, db: Session = Depends(get_db)):
    """切换接口收藏状态"""
    interface = db.query(Interface).filter(Interface.id == interface_id).first()
    if not interface:
        raise HTTPException(status_code=404, detail="接口不存在")
    
    interface.is_favorite = not interface.is_favorite
    db.commit()
    
    return {"id": interface.id, "is_favorite": interface.is_favorite}

@router.get("/{interface_id}", response_model=InterfaceResponse)
async def get_interface(interface_id: int, db: Session = Depends(get_db)):
    """获取接口详情"""
    interface = db.query(Interface).filter(Interface.id == interface_id).first()
    if not interface:
        raise HTTPException(status_code=404, detail="接口不存在")
    return interface

@router.post("/", response_model=InterfaceResponse)
async def create_interface(interface: InterfaceCreate, db: Session = Depends(get_db)):
    """创建接口"""
    db_interface = Interface(**interface.dict())
    db.add(db_interface)
    db.commit()
    db.refresh(db_interface)
    return db_interface

@router.put("/{interface_id}", response_model=InterfaceResponse)
async def update_interface(interface_id: int, interface: InterfaceUpdate, db: Session = Depends(get_db)):
    """更新接口"""
    db_interface = db.query(Interface).filter(Interface.id == interface_id).first()
    if not db_interface:
        raise HTTPException(status_code=404, detail="接口不存在")
    
    for key, value in interface.dict(exclude_unset=True).items():
        setattr(db_interface, key, value)
    
    db.commit()
    db.refresh(db_interface)
    return db_interface

@router.delete("/{interface_id}")
async def delete_interface(interface_id: int, db: Session = Depends(get_db)):
    """删除接口"""
    db_interface = db.query(Interface).filter(Interface.id == interface_id).first()
    if not db_interface:
        raise HTTPException(status_code=404, detail="接口不存在")
    
    db.delete(db_interface)
    db.commit()
    return {"message": "删除成功"}

@router.post("/import-json")
async def import_interfaces_json(request: ImportRequest, db: Session = Depends(get_db)):
    """导入接口 - JSON格式 (支持 Postman/Swagger)"""
    try:
        if request.format == "postman":
            # 解析 Postman Collection
            data = json.loads(request.content)
            interfaces_data = parse_postman(data, request.project_id)
        elif request.format == "swagger":
            # 解析 Swagger/OpenAPI
            data = json.loads(request.content)
            interfaces_data = parse_swagger(data, request.project_id)
        elif request.format == "har":
            # 解析 HAR
            data = json.loads(request.content)
            interfaces_data = parse_har(data, request.project_id)
        else:
            raise HTTPException(status_code=400, detail=f"不支持的格式: {request.format}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON 解析失败")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"解析失败: {str(e)}")
    
    # 创建接口记录
    created_interfaces = []
    for data in interfaces_data:
        try:
            db_interface = Interface(**data)
            db.add(db_interface)
            created_interfaces.append(data["name"])
        except Exception as e:
            continue
    
    db.commit()
    
    return {
        "message": f"成功导入 {len(created_interfaces)} 个接口",
        "interfaces": created_interfaces
    }


def parse_postman(data: dict, project_id: int) -> list:
    """解析 Postman Collection"""
    interfaces = []
    items = data.get("item", [])
    
    def parse_items(item_list, base_url=""):
        for item in item_list:
            if "item" in item:  # 文件夹
                parse_items(item["item"], base_url)
            else:
                request = item.get("request", {})
                method = request.get("method", "GET")
                url = request.get("url", {})
                if isinstance(url, str):
                    full_url = url
                else:
                    full_url = url.get("raw", "")
                
                # 处理变量 {{variable}}
                full_url = full_url.replace("{{baseUrl}}", "").replace("{{base_url}}", "")
                
                headers = {}
                for h in request.get("header", []):
                    headers[h.get("key", "")] = h.get("value", "")
                
                body = request.get("body", {})
                body_data = body.get("raw", "{}")
                try:
                    body_json = json.loads(body_data)
                except:
                    body_json = body_data
                
                interfaces.append({
                    "name": item.get("name", "未命名"),
                    "method": method,
                    "url": full_url,
                    "headers": headers,
                    "body": body_json if isinstance(body_json, dict) else {},
                    "body_type": body.get("mode", "raw"),
                    "project_id": project_id
                })
    
    parse_items(items)
    return interfaces


def parse_swagger(data: dict, project_id: int) -> list:
    """解析 Swagger/OpenAPI"""
    interfaces = []
    paths = data.get("paths", {})
    base_url = data.get("servers", [{}])[0].get("url", "") if data.get("servers") else ""
    
    for path, methods in paths.items():
        for method, details in methods.items():
            if method.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                params = {}
                for p in details.get("parameters", []):
                    if p.get("in") == "query":
                        params[p.get("name", "")] = ""
                
                interfaces.append({
                    "name": details.get("summary", details.get("operationId", path)),
                    "method": method.upper(),
                    "url": base_url + path,
                    "description": details.get("description", ""),
                    "params": params,
                    "body": {},
                    "body_type": "json",
                    "project_id": project_id
                })
    
    return interfaces


def parse_har(data: dict, project_id: int) -> list:
    """解析 HAR"""
    interfaces = []
    entries = data.get("log", {}).get("entries", [])
    
    for entry in entries:
        request = entry.get("request", {})
        method = request.get("method", "GET")
        url = request.get("url", "")
        
        # 解析query参数
        params = {}
        for q in request.get("queryString", []):
            params[q.get("name", "")] = q.get("value", "")
        
        # 解析headers
        headers = {}
        for h in request.get("headers", []):
            headers[h.get("name", "")] = h.get("value", "")
        
        # 解析body
        post_data = request.get("postData", {})
        body = post_data.get("text", "{}")
        try:
            body_json = json.loads(body)
        except:
            body_json = body
        
        interfaces.append({
            "name": f"{method} {url}",
            "method": method,
            "url": url,
            "headers": headers,
            "params": params,
            "body": body_json if isinstance(body_json, dict) else {},
            "body_type": post_data.get("mimeType", "application/json").split(";")[0],
            "project_id": project_id
        })
    
    return interfaces

@router.post("/import")
async def import_interfaces_api(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    导入接口 - 支持 Excel, CSV, YAML, JSON 格式
    
    Excel/CSV 格式表头:
    - name: 接口名称
    - method: 请求方法
    - url: 接口地址
    - description: 描述
    - headers: 请求头 (JSON)
    - params: 参数 (JSON)
    - body: 请求体 (JSON)
    - body_type: 请求体类型 (json/form-data/x-www-form-urlencoded/raw)
    
    JSON 格式:
    ```json
    {
      "interfaces": [
        {"name": "登录", "method": "POST", "url": "/api/login", "body_type": "json"}
      ]
    }
    ```
    """
    # 读取文件内容
    content = await file.read()
    
    # 解析文件
    try:
        interfaces_data = import_interfaces(content, file.filename, project_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"解析文件失败: {str(e)}")
    
    # 创建接口记录
    created_interfaces = []
    for data in interfaces_data:
        try:
            db_interface = Interface(**data)
            db.add(db_interface)
            created_interfaces.append(data["name"])
        except Exception as e:
            continue
    
    db.commit()
    
    return {
        "message": f"成功导入 {len(created_interfaces)} 个接口",
        "interfaces": created_interfaces
    }

@router.post("/execute")
async def execute_interface(
    interface_id: int,
    base_url: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """执行单个接口（通过接口ID）"""
    interface = db.query(Interface).filter(Interface.id == interface_id).first()
    if not interface:
        raise HTTPException(status_code=404, detail="接口不存在")
    
    executor.base_url = base_url or ""
    
    result = await executor.execute(
        method=interface.method,
        url=interface.url,
        headers=interface.headers,
        params=interface.params,
        body=interface.body,
        body_type=interface.body_type or "json"
    )
    
    return {
        "interface": {
            "id": interface.id,
            "name": interface.name,
            "method": interface.method,
            "url": interface.url
        },
        "result": result
    }


@router.post("/execute-direct")
async def execute_interface_direct(
    method: str = Body(default="GET"),
    url: str = Body(default=""),
    headers: Dict[str, Any] = Body(default=None),
    params: Dict[str, Any] = Body(default=None),
    body: Any = Body(default=None),
    body_type: str = Body(default="json"),
    base_url: str = Body(default=None),
    assertions: List[Dict[str, Any]] = Body(default=None),
    interface_id: int = Body(default=None),
    save_result: bool = Body(default=False),
    var_extracts: List[Dict[str, Any]] = Body(default=None)
):
    """直接执行接口（无需保存接口ID）
    
    请求示例:
    {
        "method": "GET",
        "url": "https://api.example.com/users",
        "headers": {"Authorization": "Bearer xxx"},
        "params": {"page": 1},
        "body_type": "json"
    }
    """
    if not url:
        raise HTTPException(status_code=400, detail="URL 不能为空")
    
    executor.base_url = base_url or ""
    
    # 替换变量
    url = executor.replace_variables(url)
    if headers:
        headers = {k: executor.replace_variables(v) for k, v in headers.items()}
    if params:
        params = {k: executor.replace_variables(v) for k, v in params.items()}
    
    result = await executor.execute(
        method=method.upper(),
        url=url,
        headers=headers,
        params=params,
        body=body,
        body_type=body_type
    )
    
    # 执行断言
    assertion_results = []
    passed = True
    if assertions:
        for assertion in assertions:
            assertion_type = assertion.get('type')
            expected = assertion.get('expected')
            actual = None
            
            if assertion_type == 'status':
                actual = result.get('status_code')
            elif assertion_type == 'body_contains':
                actual = str(result.get('body', ''))
                expected = str(expected)
            
            is_pass = str(actual) == str(expected)
            if not is_pass:
                passed = False
            
            assertion_results.append({
                'type': assertion_type,
                'expected': expected,
                'actual': actual,
                'passed': is_pass
            })
    
    # 保存结果到数据库
    if save_result and interface_id:
        from app.core.database import SessionLocal
        db = SessionLocal()
        try:
            interface = db.query(Interface).filter(Interface.id == interface_id).first()
            if interface:
                interface.last_status_code = result.get('status_code')
                interface.last_response_time = result.get('elapsed_ms')
                interface.last_response_body = json.dumps(result.get('body', {}))
                interface.last_executed_at = datetime.now()
                db.commit()
                print(f"保存成功: interface_id={interface_id}, status={result.get('status_code')}")
        except Exception as e:
            print(f"保存执行结果失败: {e}")
        finally:
            db.close()
    
    return {
        "result": result,
        "assertions": assertion_results,
        "passed": passed
    }

@router.post("/execute-chain")
async def execute_interface_chain(
    interfaces: List[Dict[str, Any]],
    base_url: Optional[str] = None,
    global_vars: Optional[Dict[str, Any]] = None
):
    """执行接口链 - 支持多接口关联
    
    请求示例:
    ```json
    {
      "base_url": "https://api.example.com",
      "global_vars": {"token": "abc123"},
      "interfaces": [
        {
          "name": "登录",
          "method": "POST",
          "url": "/api/login",
          "body": {"username": "test", "password": "123456"},
          "body_type": "json",
          "var_name": "login"
        },
        {
          "name": "获取用户信息",
          "method": "GET",
          "url": "/api/user/info",
          "headers": {"Authorization": "{{login.response.token}}"},
          "var_name": "user_info"
        }
      ]
    }
    ```
    """
    executor.base_url = base_url or ""
    
    results = await executor.execute_chain(interfaces, global_vars)
    
    return {
        "results": results,
        "summary": {
            "total": len(results),
            "success": sum(1 for r in results if r["result"].get("status_code", 0) == 200),
            "failed": sum(1 for r in results if r["result"].get("status_code", 0) != 200)
        }
    }

@router.post("/execute-batch")
async def execute_batch(
    interface_ids: List[int],
    base_url: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """批量执行多个接口"""
    interfaces = db.query(Interface).filter(Interface.id.in_(interface_ids)).all()
    
    if not interfaces:
        raise HTTPException(status_code=404, detail="未找到指定的接口")
    
    executor.base_url = base_url or ""
    
    interface_list = [
        {
            "name": i.name,
            "method": i.method,
            "url": i.url,
            "headers": i.headers,
            "params": i.params,
            "body": i.body,
            "body_type": i.body_type or "json"
        }
        for i in interfaces
    ]
    
    results = await executor.execute_chain(interface_list)
    
    return {
        "results": results
    }
