/**
 * 断言配置组件
 */
import { Select, Input, Button } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

const { Option } = Select

export interface Assertion {
  type: 'status' | 'json' | 'response_time' | 'contains'
  path?: string
  expected: any
  operator?: string
}

interface AssertionConfigProps {
  value?: Assertion[]
  onChange: (value: Assertion[]) => void
}

export default function AssertionConfig({ value, onChange }: AssertionConfigProps) {
  const assertions = value || []

  const addAssertion = () => {
    onChange([...assertions, { type: 'status', expected: 200 }])
  }

  const updateAssertion = (index: number, field: string, val: any) => {
    const newAssertions = [...assertions]
    newAssertions[index] = { ...newAssertions[index], [field]: val }
    onChange(newAssertions)
  }

  const removeAssertion = (index: number) => {
    onChange(assertions.filter((_, i) => i !== index))
  }

  return (
    <div>
      {assertions.map((assertion, index) => (
        <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <Select
            value={assertion.type}
            onChange={(val) => updateAssertion(index, 'type', val)}
            style={{ width: 120 }}
            size="small"
          >
            <Option value="status">状态码</Option>
            <Option value="json">JSON断言</Option>
            <Option value="response_time">响应时间</Option>
            <Option value="contains">包含</Option>
          </Select>
          
          {assertion.type === 'json' && (
            <Input
              placeholder="$.data.code"
              value={assertion.path}
              onChange={(e) => updateAssertion(index, 'path', e.target.value)}
              style={{ width: 150 }}
              size="small"
            />
          )}
          
          <Input
            placeholder="期望值"
            value={assertion.expected}
            onChange={(e) => updateAssertion(index, 'expected', e.target.value)}
            style={{ width: 100 }}
            size="small"
          />
          
          {assertion.type === 'response_time' && (
            <Select
              value={assertion.operator || '<'}
              onChange={(val) => updateAssertion(index, 'operator', val)}
              style={{ width: 70 }}
              size="small"
            >
              <Option value="<">&lt;</Option>
              <Option value=">">&gt;</Option>
              <Option value="==">==</Option>
            </Select>
          )}
          
          <Button 
            size="small" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => removeAssertion(index)} 
          />
        </div>
      ))}
      <Button 
        type="dashed" 
        size="small" 
        icon={<PlusOutlined />} 
        onClick={addAssertion}
      >
        添加断言
      </Button>
    </div>
  )
}
