// Resolve template parameters using records from the private sending service.
export const committeeUpdateTemplate = {
  name: 'forum_committee_update_ar',
  language: 'ar',
  category: 'UTILITY',
  body: [
    'السلام عليكم {{1}}،',
    '',
    'نُشر تحديث جديد لأعضاء اللجنة العليا في بوابة منتدى العمل التطوعي.',
    '',
    '*عنوان التحديث*',
    '{{2}}',
    '',
    'للاطلاع على التفاصيل، اضغط على زر «عرض المستجدات» وسجّل الدخول بحسابك المعتمد.',
    '',
    'منتدى العمل التطوعي'
  ].join('\n'),
  buttonText: 'عرض المستجدات'
};

export function prepareCommitteeUpdate(member, publication, updatesPageUrl) {
  const values = [member?.name, publication?.notificationTitle];
  if (values.some(value => typeof value !== 'string' || !value.trim() || /[\r\n\t]/u.test(value))) {
    throw new Error('Expected a member name and an approved single-line notification title.');
  }
  const url = new URL(updatesPageUrl);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Expected an HTTPS URL for the committee updates page.');
  }
  const parameters = values.map(value => ({ type: 'text', text: value.trim() }));
  return {
    template: committeeUpdateTemplate.name,
    language: committeeUpdateTemplate.language,
    parameters,
    preview: committeeUpdateTemplate.body.replace(/\{\{([12])\}\}/gu,
      (_, position) => parameters[Number(position) - 1].text),
    button: { text: committeeUpdateTemplate.buttonText, url: url.href }
  };
}
