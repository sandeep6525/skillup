import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Search, Filter, Star, BookOpen, Layers, ArrowRight } from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const selectedCategory = searchParams.get('category') || '';
  const selectedLevel = searchParams.get('level') || '';

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['courses', searchTerm, selectedCategory, selectedLevel],
    queryFn: async () => {
      const res = await api.get('/courses', {
        params: {
          search: searchTerm || undefined,
          category: selectedCategory || undefined,
          level: selectedLevel || undefined,
        },
      });
      return res.data;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/courses/categories');
      return res.data.data;
    },
  });

  const courses = coursesData?.data || [];
  const categories = categoriesData || [];

  const handleCategoryChange = (slug: string) => {
    if (slug === selectedCategory) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
           <h1 className="text-3xl font-extrabold text-[#000000] mt-1">Explore SkillUp Courses</h1>
          <p className="text-sm text-slate-500 mt-1">
            Industry-aligned certifications, full-stack architectures, and hands-on capstone projects.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search keywords, React, AI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5DBA58]/20 focus:border-[#5DBA58] shadow-xs"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => handleCategoryChange('')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 cursor-pointer ${
            !selectedCategory
              ? 'bg-[#5DBA58] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-[#EAF5EA]'
          }`}
        >
          All Domains
        </button>
        {categories.map((c: any) => (
          <button
            key={c.id}
            onClick={() => handleCategoryChange(c.slug)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 cursor-pointer ${
              selectedCategory === c.slug
                ? 'bg-[#5DBA58] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-[#EAF5EA]'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Course Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF5EA] text-[#5DBA58] mx-auto flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#000000] mb-1">No courses found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            Try adjusting your search criteria or explore other categories.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSearchParams({});
            }}
            className="px-5 py-2 text-xs font-semibold text-[#5DBA58] bg-[#EAF5EA] hover:bg-[#d4edd4] rounded-xl transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course: any) => (
            <div
              key={course.id}
              className="group rounded-2xl bg-white border border-slate-200 overflow-hidden hover:shadow-xl hover:border-[#5DBA58]/50 transition-all flex flex-col"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <img
                  src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80';
                  }}
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 text-[11px] font-bold text-white bg-black/80 backdrop-blur-md rounded-md shadow-xs">
                  {course.level}
                </span>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[#5DBA58] font-bold">{course.category?.name || 'Computer Science'}</span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{course.averageRating || '4.9'}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#000000] mb-2 group-hover:text-[#5DBA58] transition-colors line-clamp-2">
                    {course.title}
                  </h3>

                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                    {course.subtitle || course.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 line-through mr-1.5">
                      {course.discountPrice ? `₹${course.price}` : ''}
                    </span>
                    <span className="text-lg font-extrabold text-[#000000]">
                      ₹{course.discountPrice || course.price}
                    </span>
                  </div>

                  <Link
                    to={`/courses/${course.slug}`}
                    className="px-4 py-2 text-xs font-bold text-[#5DBA58] bg-[#EAF5EA] group-hover:bg-[#5DBA58] group-hover:text-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>View Course</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
