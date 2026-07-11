export interface TechPattern {
  name: string;
  pattern: RegExp;
}

export const TECH_PATTERNS: TechPattern[] = [
  { name: "React", pattern: /\breact(?:\.js|js)?\b/i },
  { name: "React Native", pattern: /\breact\s*native\b/i },
  { name: "Vue.js", pattern: /\bvue(?:\.js|js)?\b/i },
  { name: "Angular", pattern: /\bangular\b/i },
  { name: "Next.js", pattern: /\bnext(?:\.js|js)?\b/i },
  { name: "Nuxt", pattern: /\bnuxt(?:\.js|js)?\b/i },
  { name: "Svelte", pattern: /\bsvelte\b/i },
  { name: "TypeScript", pattern: /\btypescript\b|\bts\b/i },
  { name: "JavaScript", pattern: /\bjavascript\b|\bjs\b/i },
  { name: "Node.js", pattern: /\bnode(?:\.js|js)?\b/i },
  { name: "Python", pattern: /\bpython\b/i },
  { name: "Django", pattern: /\bdjango\b/i },
  { name: "Flask", pattern: /\bflask\b/i },
  { name: "FastAPI", pattern: /\bfastapi\b/i },
  { name: "Java", pattern: /\bjava\b(?!\s*script)/i },
  { name: "Spring", pattern: /\bspring(?:\s*boot)?\b/i },
  { name: "Kotlin", pattern: /\bkotlin\b/i },
  { name: "C#", pattern: /\bc#\b|\b\.net\b|\bdotnet\b/i },
  { name: "Go", pattern: /\b(?:golang|go)\b/i },
  { name: "Rust", pattern: /\brust\b/i },
  { name: "PHP", pattern: /\bphp\b/i },
  { name: "Laravel", pattern: /\blaravel\b/i },
  { name: "Ruby", pattern: /\bruby\b/i },
  { name: "Rails", pattern: /\brails\b/i },
  { name: "Swift", pattern: /\bswift\b/i },
  { name: "AWS", pattern: /\baws\b|\bamazon\s+web\s+services\b/i },
  { name: "Azure", pattern: /\bazure\b/i },
  { name: "GCP", pattern: /\bgcp\b|\bgoogle\s+cloud\b/i },
  { name: "Docker", pattern: /\bdocker\b/i },
  { name: "Kubernetes", pattern: /\bkubernetes\b|\bk8s\b/i },
  { name: "Terraform", pattern: /\bterraform\b/i },
  { name: "PostgreSQL", pattern: /\bpostgres(?:ql)?\b/i },
  { name: "MySQL", pattern: /\bmysql\b/i },
  { name: "MongoDB", pattern: /\bmongodb\b|\bmongo\b/i },
  { name: "Redis", pattern: /\bredis\b/i },
  { name: "GraphQL", pattern: /\bgraphql\b/i },
  { name: "REST API", pattern: /\brest(?:ful)?\s+api\b/i },
  { name: "Microservices", pattern: /\bmicroservices?\b/i },
  { name: "Kafka", pattern: /\bkafka\b/i },
  { name: "Elasticsearch", pattern: /\belasticsearch\b|\belastic\s+search\b/i },
  { name: "TensorFlow", pattern: /\btensorflow\b/i },
  { name: "PyTorch", pattern: /\bpytorch\b/i },
  { name: "OpenAI", pattern: /\bopenai\b|\bgpt\b|\bllm\b|\blarge\s+language\s+model\b/i },
  { name: "Machine Learning", pattern: /\bmachine\s+learning\b|\bml\b/i },
  { name: "Data Engineering", pattern: /\bdata\s+engineer(?:ing)?\b/i },
  { name: "Spark", pattern: /\bspark\b|\bpyspark\b/i },
  { name: "Snowflake", pattern: /\bsnowflake\b/i },
  { name: "dbt", pattern: /\bdbt\b/i },
  { name: "CI/CD", pattern: /\bci\/?cd\b|\bcontinuous\s+(?:integration|delivery|deployment)\b/i },
  { name: "Git", pattern: /\bgit\b/i },
  { name: "Agile", pattern: /\bagile\b|\bscrum\b/i },
];

export function extractTechnologies(text: string): string[] {
  const found = new Set<string>();

  for (const { name, pattern } of TECH_PATTERNS) {
    if (pattern.test(text)) {
      found.add(name);
    }
  }

  return [...found];
}

export function countTechnologies(texts: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const text of texts) {
    for (const tech of extractTechnologies(text)) {
      counts.set(tech, (counts.get(tech) ?? 0) + 1);
    }
  }

  return counts;
}
