import Header from "@/components/Header";
import PartsTable from "@/components/PartsTable";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <PartsTable />
      </main>
    </div>
  );
};

export default Index;
