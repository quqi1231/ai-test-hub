"""
数据库初始化脚本
"""
from app.core.database import engine
# 导入所有模型的 Base
from app.models.models import Base as ModelsBase
from app.models.test_suite import Base as TestSuiteBase

# 合并所有 Base 的 metadata
from sqlalchemy.orm import declarative_base
AllBase = declarative_base()

# 将所有表的 metadata 合并
AllBase.metadata = ModelsBase.metadata

def init_db():
    """初始化数据库表"""
    AllBase.metadata.create_all(bind=engine)
    print("数据库表创建成功!")

if __name__ == "__main__":
    init_db()
