/**
 * 文本处理模式测试
 * 测试基于文本长度的自动模式选择功能
 */

// 模拟前端的文本长度检测逻辑
function determineProcessingMode(text, userMode = 'auto') {
  if (userMode !== 'auto') {
    return userMode;
  }

  const textLength = text.trim().length;
  const wordCount = text.trim().split(/\s+/).length;

  // 长文本阈值：超过150字符或30个词
  if (textLength > 150 || wordCount > 30) {
    return 'optimize_long';
  } else {
    return 'optimize';
  }
}

// 测试用例
const testCases = [
  {
    name: "短文本测试",
    text: "今天天气不错呃，我想出去走走。",
    expectedMode: "optimize"
  },
  {
    name: "中等文本测试", 
    text: "今天天气不错呃，我想出去走走。然后呢，可能会去公园那边看看，就是说，最近工作比较累，想放松一下。那个，对了，还要买点东西。",
    expectedMode: "optimize"
  },
  {
    name: "长文本测试",
    text: "今天天气不错呃，我想出去走走。然后呢，可能会去公园那边看看，就是说，最近工作比较累，想放松一下。那个，对了，还要买点东西。其实呢，我觉得这个项目的设计有点问题，比如说用户界面不够直观，然后呢，功能也不够完善。我们应该重新考虑一下整体的架构，就是说，从用户体验的角度来思考。另外呢，技术选型也需要优化，比如说前端框架可以考虑更新的版本。",
    expectedMode: "optimize_long"
  },
  {
    name: "超长文本测试",
    text: "今天天气不错呃，我想出去走走。然后呢，可能会去公园那边看看，就是说，最近工作比较累，想放松一下。那个，对了，还要买点东西。其实呢，我觉得这个项目的设计有点问题，比如说用户界面不够直观，然后呢，功能也不够完善。我们应该重新考虑一下整体的架构，就是说，从用户体验的角度来思考。另外呢，技术选型也需要优化，比如说前端框架可以考虑更新的版本。还有就是说，数据库的设计也需要改进，现在的查询效率不高，经常出现超时的情况。我觉得我们可以考虑使用更高效的索引策略，或者是分库分表的方案。对了，还有一个问题就是，现在的部署流程太复杂了，每次发布都要很长时间，这样影响开发效率。我们是不是可以考虑使用Docker容器化，然后配合CI/CD流水线，这样可以大大提高部署效率。",
    expectedMode: "optimize_long"
  }
];

console.log("=".repeat(60));
console.log("文本处理模式自动选择测试");
console.log("=".repeat(60));

testCases.forEach((testCase, index) => {
  const actualMode = determineProcessingMode(testCase.text);
  const textLength = testCase.text.length;
  const wordCount = testCase.text.trim().split(/\s+/).length;
  const isPass = actualMode === testCase.expectedMode;
  
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`   文本长度: ${textLength} 字符`);
  console.log(`   词数统计: ${wordCount} 词`);
  console.log(`   预期模式: ${testCase.expectedMode}`);
  console.log(`   实际模式: ${actualMode}`);
  console.log(`   测试结果: ${isPass ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   文本预览: "${testCase.text.substring(0, 50)}..."`);
});

console.log("\n" + "=".repeat(60));
console.log("测试完成");
console.log("=".repeat(60));

// 显示处理模式的区别说明
console.log("\n处理模式说明:");
console.log("• optimize: 适用于短文本，保持最小化修改，主要去除填充词和纠正错误");
console.log("• optimize_long: 适用于长文本，额外进行思考过程清理和智能分段");
console.log("\n阈值设置:");
console.log("• 长文本阈值: 超过150字符或30个词");
console.log("• 这个阈值可以根据实际使用情况进行调整");