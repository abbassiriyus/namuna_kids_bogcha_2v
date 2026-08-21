export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/admin/dashboard',
      permanent: false,
    },
  };
}

export default function AdminIndex() {
  return null;
}
