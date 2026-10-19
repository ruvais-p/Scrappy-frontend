import CustomerBill from '@/components/customer-bill';

export default async function Page({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 return <CustomerBill token={token}/>;
}
