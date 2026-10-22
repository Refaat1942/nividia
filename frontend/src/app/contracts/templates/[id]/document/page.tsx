'use client';

import { useParams } from 'next/navigation';
import ContractEditor from '@/components/ContractEditor';

export default function TemplateDocumentPage() {
  const { id } = useParams();
  return <ContractEditor loadPath={`/contracts/templates/${id}/document`} backHref="/contracts" />;
}
