<script setup lang="ts">
// The scenario brief: what's going on and what tone to aim for.
// Fills the left column of the practice page: a large title at the top, and the situation
// with "Aim for" / "Category" pinned to the bottom under a hairline.
withDefaults(
  defineProps<{
    title: string
    category: string
    tone: string
    context?: string
  }>(),
  { context: '' },
)
</script>

<template>
  <aside class="brief">
    <h1>{{ title }}</h1>

    <div class="bottom">
      <template v-if="context">
        <p class="label">The situation</p>
        <p class="context">{{ context }}</p>
      </template>
      <dl class="meta">
        <div>
          <dt>Aim for</dt>
          <dd>{{ tone }}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd class="category">{{ category }}</dd>
        </div>
      </dl>
    </div>
  </aside>
</template>

<style scoped>
.brief {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
}
h1 {
  margin: 0;
  font-size: clamp(30px, 3.4vw, 50px);
  line-height: 1.02;
  font-weight: 400;
  letter-spacing: -0.035em;
  max-width: 14ch;
}
.bottom {
  margin-top: auto;
}
.label {
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--ink-rule);
  font-size: 16px;
  font-weight: 500;
}
.context {
  margin: 12px 0 20px;
  font-size: 15px;
  line-height: 1.55;
  color: var(--ink-soft);
}
.meta {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
dt {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
dd {
  margin: 3px 0 0;
  font-size: 16px;
  font-weight: 500;
}
.category {
  text-transform: capitalize;
}

@media (max-width: 860px) {
  .brief { height: auto; gap: 16px; }
  .bottom { margin-top: 0; }
}
</style>
