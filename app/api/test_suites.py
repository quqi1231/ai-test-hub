"""
测试集 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.test_suite import (
    TestSuiteCreate, TestSuiteResponse, TestSuiteWithItems,
    TestSuiteItemCreate
)
from app.models import TestSuite, TestSuiteItem

router = APIRouter()


@router.get("/", response_model=List[TestSuiteResponse])
async def list_test_suites(project_id: int, db: Session = Depends(get_db)):
    """获取测试集列表"""
    return db.query(TestSuite).filter(TestSuite.project_id == project_id).all()


@router.post("/", response_model=TestSuiteResponse)
async def create_test_suite(suite: TestSuiteCreate, db: Session = Depends(get_db)):
    """创建测试集"""
    db_suite = TestSuite(
        project_id=suite.project_id,
        name=suite.name,
        description=suite.description,
        environment=suite.environment,
        concurrency=suite.concurrency
    )
    db.add(db_suite)
    db.commit()
    db.refresh(db_suite)
    
    # 添加项目
    if suite.items:
        for item in suite.items:
            db_item = TestSuiteItem(
                suite_id=db_suite.id,
                interface_id=item.interface_id,
                order_index=item.order_index,
                assertions=item.assertions,
                var_extracts=item.var_extracts,
                delay_ms=item.delay_ms,
                enabled=item.enabled
            )
            db.add(db_item)
        db.commit()
    
    return db_suite


@router.get("/{suite_id}", response_model=TestSuiteWithItems)
async def get_test_suite(suite_id: int, db: Session = Depends(get_db)):
    """获取测试集详情（含项目）"""
    suite = db.query(TestSuite).filter(TestSuite.id == suite_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="测试集不存在")
    
    items = db.query(TestSuiteItem).filter(
        TestSuiteItem.suite_id == suite_id
    ).order_by(TestSuiteItem.order_index).all()
    
    return {
        "id": suite.id,
        "project_id": suite.project_id,
        "name": suite.name,
        "description": suite.description,
        "environment": suite.environment,
        "concurrency": suite.concurrency,
        "is_enabled": suite.is_enabled,
        "created_at": suite.created_at,
        "updated_at": suite.updated_at,
        "items": [
            {
                "id": item.id,
                "suite_id": item.suite_id,
                "interface_id": item.interface_id,
                "order_index": item.order_index,
                "assertions": item.assertions,
                "var_extracts": item.var_extracts,
                "delay_ms": item.delay_ms,
                "enabled": item.enabled
            }
            for item in items
        ]
    }


@router.put("/{suite_id}", response_model=TestSuiteResponse)
async def update_test_suite(suite_id: int, suite: TestSuiteCreate, db: Session = Depends(get_db)):
    """更新测试集"""
    db_suite = db.query(TestSuite).filter(TestSuite.id == suite_id).first()
    if not db_suite:
        raise HTTPException(status_code=404, detail="测试集不存在")
    
    db_suite.name = suite.name
    db_suite.description = suite.description
    db_suite.environment = suite.environment
    db_suite.concurrency = suite.concurrency
    
    db.commit()
    db.refresh(db_suite)
    return db_suite


@router.delete("/{suite_id}")
async def delete_test_suite(suite_id: int, db: Session = Depends(get_db)):
    """删除测试集"""
    db_suite = db.query(TestSuite).filter(TestSuite.id == suite_id).first()
    if not db_suite:
        raise HTTPException(status_code=404, detail="测试集不存在")
    
    # 删除关联项目
    db.query(TestSuiteItem).filter(TestSuiteItem.suite_id == suite_id).delete()
    db.delete(db_suite)
    db.commit()
    
    return {"message": "删除成功"}


@router.post("/{suite_id}/items")
async def add_suite_item(
    suite_id: int,
    item: TestSuiteItemCreate,
    db: Session = Depends(get_db)
):
    """添加测试集项目"""
    suite = db.query(TestSuite).filter(TestSuite.id == suite_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="测试集不存在")
    
    db_item = TestSuiteItem(
        suite_id=suite_id,
        interface_id=item.interface_id,
        order_index=item.order_index,
        assertions=item.assertions,
        var_extracts=item.var_extracts,
        delay_ms=item.delay_ms,
        enabled=item.enabled
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    return db_item


@router.delete("/{suite_id}/items/{item_id}")
async def delete_suite_item(suite_id: int, item_id: int, db: Session = Depends(get_db)):
    """删除测试集项目"""
    item = db.query(TestSuiteItem).filter(
        TestSuiteItem.id == item_id,
        TestSuiteItem.suite_id == suite_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    db.delete(item)
    db.commit()
    
    return {"message": "删除成功"}
