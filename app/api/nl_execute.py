"""
自然语言执行 API - 将自然语言转换为测试步骤
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/api/nl-execute", tags=["自然语言执行"])

# 测试步骤模板库
STEP_TEMPLATES = {
    "导航": ["打开 {url}", "跳转到 {url}", "访问 {url}"],
    "输入": ["在{element}输入{value}", "填写{element}为{value}", "向{element}输入{value}"],
    "点击": ["点击{element}", "点击{element}按钮", "点击{element}链接"],
    "等待": ["等待{seconds}秒", "等待页面加载", "等待{element}出现"],
    "验证": ["验证{element}显示{expected}", "检查{element}等于{expected}", "确认{element}为{expected}"],
    "选择": ["在{element}选择{value}", "从{element}下拉框选择{value}"],
    "勾选": ["勾选{element}", "取消勾选{element}"],
    "上传": ["上传文件到{element}", "上传{filename}到{element}"],
}


class NLExecuteRequest(BaseModel):
    """自然语言执行请求"""
    steps: List[str]  # 自然语言步骤列表
    target_url: Optional[str] = None  # 目标 URL（可选）


class ParsedStep(BaseModel):
    """解析后的步骤"""
    original: str
    action: str  # 动作类型
    element: Optional[str] = None  # 元素
    value: Optional[str] = None  # 值
    confidence: float = 0.9  # 置信度


class NLExecuteResponse(BaseModel):
    """自然语言执行响应"""
    parsed_steps: List[ParsedStep]
    execution_plan: List[Dict[str, Any]]
    warnings: List[str] = []


# 动作关键词映射
ACTION_KEYWORDS = {
    "导航": ["打开", "访问", "跳转", "去", "前往", " navigate", "go to", "open"],
    "输入": ["输入", "填写", "填入", "录入", "输入框", "type", "input", "fill"],
    "点击": ["点击", "触发", "按下", "选择", "click", "tap", "press"],
    "等待": ["等待", "延迟", "sleep", "wait"],
    "验证": ["验证", "检查", "确认", "assert", "verify", "check", "expect"],
    "选择": ["选择", "下拉", "select", "choose", "pick"],
    "勾选": ["勾选", "勾", "checkbox", "check"],
    "上传": ["上传", "upload"],
    "滚动": ["滚动", "scroll"],
    "截图": ["截图", "screenshot"],
}


def parse_step(step: str) -> ParsedStep:
    """解析单个自然语言步骤"""
    step = step.strip()
    original = step
    
    # 识别动作类型
    action = "未知"
    for act, keywords in ACTION_KEYWORDS.items():
        for kw in keywords:
            if kw in step.lower():
                action = act
                break
        if action != "未知":
            break
    
    # 提取元素和值（简单实现）
    element = None
    value = None
    
    # 尝试提取 URL
    if "http" in step.lower() or "://" in step:
        import re
        urls = re.findall(r'https?://[^\s]+', step)
        if urls:
            value = urls[0]
            action = "导航"
    
    # 提取数字（用于等待）
    import re
    numbers = re.findall(r'\d+', step)
    if action == "等待" and numbers:
        value = numbers[0]
    
    # 尝试提取引号中的内容
    quoted = re.findall(r'["\']([^"\']+)["\']', step)
    if quoted:
        if action in ["输入", "验证", "选择"]:
            value = quoted[0]
    
    # 尝试识别元素（简单的关键词匹配）
    element_keywords = ["按钮", "输入框", "链接", "菜单", "弹窗", "输入", "框", "栏", "元素", "element", "button", "input", "field"]
    for kw in element_keywords:
        if kw in step:
            # 尝试提取附近的内容作为元素名
            idx = step.find(kw)
            if idx > 2:
                element = step[:idx].strip()
            else:
                element = kw
            break
    
    # 如果没识别到元素，用整个句子
    if not element:
        element = step[:50] if len(step) > 50 else step
    
    return ParsedStep(
        original=original,
        action=action,
        element=element,
        value=value,
        confidence=0.85 if action != "未知" else 0.5
    )


@router.post("/parse")
def parse_nl_steps(request: NLExecuteRequest):
    """解析自然语言步骤"""
    parsed = [parse_step(step) for step in request.steps]
    
    return {
        "parsed_steps": [p.model_dump() for p in parsed],
        "summary": f"解析了 {len(parsed)} 个步骤"
    }


@router.post("/execute")
def execute_nl(request: NLExecuteRequest):
    """
    执行自然语言步骤
    返回解析后的执行计划（可被前端用于 Playwright 执行）
    """
    # 解析步骤
    parsed = [parse_step(step) for step in request.steps]
    
    # 生成执行计划
    execution_plan = []
    warnings = []
    
    for i, step in enumerate(parsed):
        plan = {
            "step": i + 1,
            "action": step.action,
            "element": step.element,
            "value": step.value,
            "playwright_code": generate_playwright_code(step),
        }
        
        # 添加警告
        if step.action == "未知":
            warnings.append(f"步骤 {i+1}: 无法识别的动作 - {step.original}")
        
        execution_plan.append(plan)
    
    return NLExecuteResponse(
        parsed_steps=parsed,
        execution_plan=execution_plan,
        warnings=warnings
    )


def generate_playwright_code(step: ParsedStep) -> str:
    """生成 Playwright 代码"""
    element = step.element or "element"
    value = step.value or ""
    
    code_map = {
        "导航": f'await page.goto("{value or "url"}")',
        "输入": f'await page.fill("{element}", "{value}")',
        "点击": f'await page.click("{element}")',
        "等待": f'await page.waitForTimeout({value or 1000})',
        "验证": f'await expect(page.locator("{element}")).toContainText("{value}")',
        "选择": f'await page.selectOption("{element}", "{value}")',
        "勾选": f'await page.check("{element}")',
        "上传": f'await page.setInputFiles("{element}", "{value}")',
        "滚动": f'await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))',
        "截图": f'await page.screenshot({{ path: "step_{step.element}.png" }})',
    }
    
    return code_map.get(step.action, f'// TODO: 实现 {step.action} 动作')


@router.get("/templates")
def get_action_templates():
    """获取动作模板"""
    return STEP_TEMPLATES
