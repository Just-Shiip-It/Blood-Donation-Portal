import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-50 to-red-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Save Lives Through
            <span className="text-red-600"> Blood Donation</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with blood banks, schedule donations, and help save lives in your community.
            Every donation can save up to three lives.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Become a Donor</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/find-blood">Find Blood</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">1. Register</CardTitle>
                <CardDescription>
                  Create your donor profile with medical history and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Quick and secure registration process with health screening to ensure safe donations.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">2. Schedule</CardTitle>
                <CardDescription>
                  Book appointments at nearby blood banks at your convenience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Find available time slots at blood banks near you and schedule your donation.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">3. Donate</CardTitle>
                <CardDescription>
                  Make your donation and track your impact on saving lives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Complete your donation and see how your contribution helps patients in need.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">10,000+</div>
              <div className="text-gray-600">Registered Donors</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">500+</div>
              <div className="text-gray-600">Blood Banks</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">25,000+</div>
              <div className="text-gray-600">Lives Saved</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">100+</div>
              <div className="text-gray-600">Cities Covered</div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
