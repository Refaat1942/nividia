'use client';

import { useParams } from 'next/navigation';
import ContractEditor from '@/components/ContractEditor';

export default function ContractDocumentPage() {
  const { id } = useParams();
  return (
    <ContractEditor
      loadPath={`/contracts/${id}/document`}
      savePath={`/contracts/${id}/document`}
      downloadPath={`/contracts/${id}/download`}
      backHref="/contracts"
    />
  );
}
