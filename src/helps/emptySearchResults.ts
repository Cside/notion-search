const params = new URL(location.href).searchParams;
const wsName = params.get('primary_workspace_name') ?? '';
const url = params.get('primary_workspace_url') ?? '';
for (const elem of document.querySelectorAll('.workspace-name'))
  elem.textContent = wsName;

for (const elem of document.querySelectorAll<HTMLAnchorElement>(
  'a.workspace-link',
))
  elem.href = url;
