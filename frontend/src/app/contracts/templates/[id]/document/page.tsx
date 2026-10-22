'use client';

import { useParams } from 'next/navigation';
import ContractEditor from '@/components/ContractEditor';

export default function TemplateDocumentPage() {
  const { id } = useParams();
  return (
    <ContractEditor
      loadPath={`/contracts/templates/${id}/document`}
      docxPostPath={`/contracts/templates/${id}/docx`}
      backHref="/contracts"
    />
  );
}
